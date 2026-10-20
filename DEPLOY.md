# Deploying Unskinned to Kubernetes (from the VPS)

This is a copy-paste runbook you run **on the VPS** (or any machine with `kubectl`
pointing at the cluster). Nothing here needs credentials shared with anyone.

## 0. Prerequisites on the VPS

- A Kubernetes cluster. On a single VPS, [k3s](https://k3s.io) is the easiest:
  ```bash
  curl -sfL https://get.k3s.io | sh -
  export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
  kubectl get nodes        # should show Ready
  ```
- `docker` (to build images) and a **container registry** you can push to
  (Docker Hub, GHCR, or a private `registry.example.com`).
- An ingress controller + TLS:
  - k3s ships **Traefik**; these manifests assume **nginx** + **cert-manager**.
    Either install nginx-ingress + cert-manager, or adjust `infra/k8s/ingress.yaml`
    annotations/`ingressClassName` to `traefik` and use k3s' built-in certs.
- **DNS A records** pointing at the VPS IP:
  `example.com`, `www`, `app`, `central`, `ai`, `api`.

## 1. Get the code

```bash
git clone https://github.com/mabdelma/Unskinned.git
cd Unskinned
```

## 2. Build + push the images

Set `REGISTRY` to match the prefix in `infra/k8s/*.yaml`
(`registry.example.com`) — or change the manifests to your registry
with `kustomize edit set image`.

```bash
docker login <your-registry>
REGISTRY=registry.example.com TAG=latest ./scripts/build-and-push.sh
```

This builds 7 images: `auth, catalog, billing, engagement, notifications, web, agent`.

> If you use a registry other than the one baked into the manifests, run inside
> `infra/k8s`: `kustomize edit set image registry.example.com/web=YOURREG/web` (repeat per image), or sed-replace the prefix.

## 3. Create the real secrets

Do **not** commit secrets. Create them from a server-side `.env`:

```bash
cp .env.example .env     # edit: AUTH_SECRET, POSTGRES_PASSWORD, DATABASE_URL,
                         #       STRIPE_*, OPENAI_API_KEY, SMTP_*, EMAIL_FROM
kubectl create namespace app --dry-run=client -o yaml | kubectl apply -f -
kubectl -n app create secret generic app-secrets --from-env-file=.env
```

`DATABASE_URL` should point at the in-cluster Postgres:
`postgresql://app:<POSTGRES_PASSWORD>@postgres:5432/app`

## 4. Apply the platform

`secrets.example.yaml` in the kustomization is a placeholder — since you created
`app-secrets` in step 3, delete that line from `infra/k8s/kustomization.yaml`
(or keep the ConfigMap part and remove the Secret) before applying.

```bash
kubectl apply -k infra/k8s
kubectl -n app rollout status deploy/postgres   # wait for DB
```

## 5. Create the schema

```bash
kubectl -n app delete job app-migrate --ignore-not-found
kubectl apply -f infra/k8s/migrate-job.yaml
kubectl -n app logs job/app-migrate -f          # waits for "Your database is now in sync"
```

(Seed demo solutions, optional — exec into a running web pod, which already has
the repo at `/repo` and `DATABASE_URL` from the secret:)
```bash
POD=$(kubectl -n app get pod -l app=web -o jsonpath='{.items[0].metadata.name}')
kubectl -n app exec "$POD" -- npx tsx /repo/packages/db/prisma/seed.ts
```

## 6. Verify

```bash
kubectl -n app get pods,svc,ingress
kubectl -n app rollout status deploy/web deploy/auth deploy/catalog \
  deploy/billing deploy/engagement deploy/notifications deploy/agent
```

Then hit the hosts:
- `https://example.com` — marketing + app
- `https://ai.example.com` — AI advisor
- `https://api.example.com/v1/catalog` — catalog API

## 7. Updating later

```bash
git pull
REGISTRY=registry.example.com TAG=latest ./scripts/build-and-push.sh
kubectl -n app rollout restart deploy   # pull the new :latest images
# if the schema changed: re-run the migrate job (step 5)
```

---

### Notes / honesty
- Images run the TS services via `tsx` and the Next apps via `next start` — no
  cross-package compile step, which keeps the monorepo + Prisma build simple.
- **Schema is deployed with `prisma db push`, deliberately — not migrations.**
  `db push` reconciles the database to `schema.prisma`. That means a model you
  delete from the schema is a table you delete from production, so always print
  the diff first (`prisma migrate diff --from-url … --to-schema-datamodel …
  --script`) and confirm it contains no `DROP`, and always run `backup.sh` first.
  The old migration SQL lives in `packages/db/prisma/_archived-migrations/` and is
  explicitly *not* the mechanism — see the README there for why it was moved out
  of Prisma's auto-discovered path, and how to baseline properly if you ever want
  versioned migrations.
- These manifests and Dockerfiles are provided for you to run on the cluster; they
  have **not** been executed against a live cluster from here. Expect to tune the
  ingress class/cert-manager to your specific setup.

## GM-OS — team portal and orchestrator

Two services were added with the GM-OS work:

| Service | Port | Routed publicly | Purpose |
| --- | --- | --- | --- |
| `app-workforce` | 3002 | `workforce.example.com` | The team portal |
| `app-orchestrator` | 8080 | **No** | The background half — ticks every 60s |

The orchestrator is on `app_internal` only and has no Caddy route. It should
stay that way: it applies approved disposals and runs agents, and nothing
outside the stack has any reason to reach it.

### Sign-in depends on the mail server

Members authenticate with their real mailbox password, checked against Dovecot
at `IMAP_HOST` (default `mail.example.com`) over TLS. Two
consequences worth knowing before debugging a support call:

- If the mail server is unreachable the portal says so and does **not** count a
  failed attempt. An outage must not lock out the company.
- The magic-link fallback goes through `app-notifications`, so if SMTP is down
  both routes are down. That is the one shared dependency.

### Seeding

`npm --workspace @app/db run seed:gmos` is idempotent and safe to re-run. It
upserts the agent register, creates the bootstrap admin
(`GMOS_ADMIN_EMAIL`, default `founder@example.com`) and gives every
published business-card person a portal account. It will **not** re-enable an
agent that was deliberately disabled, or reset an approval level.

### Verifying a deploy

```sh
docker run --rm --network app_app_internal -v /tmp/verify-workforce.sh:/v.sh   --entrypoint sh curlimages/curl:latest /v.sh
```

`scripts/verify-workforce.sh` checks the page guards, the API guards, that a
wrong password and an unknown account produce the identical message, that the
magic-link endpoint cannot be used to enumerate staff, the security headers, and
that a full orchestrator cycle runs clean.

## Back up after a schema change, not only before

`backup.sh` runs nightly and the deploy sequence takes one before `db push`.
That protects against the push going wrong. It leaves a gap the other way: from
a successful schema change until the next nightly run, the newest structure
exists in no backup.

A restore test on 2026-08-03 landed in exactly that window and came back missing
a table created 13 minutes after the backup was taken. So:

```sh
bash backup.sh                      # before — protects against a bad push
npx prisma db push --schema=...     # apply
bash backup.sh                      # after — the new structure is now covered
```

See `gmos/00_SYSTEM/09_LOGS/BACKUP_AND_RESTORE_REPORT.md`.
