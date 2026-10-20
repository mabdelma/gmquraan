# Deploying Unskinned Investment Group

How a change gets from a working tree to a visitor. Three places are involved
and they are frequently confused, so start here:

| "Deploy to…" | What it actually is | Does a visitor see it? |
|---|---|---|
| **GitHub** | `github.com/mabdelma/example` — the source of record | **No.** Pushing changes nothing on the server. |
| **The VPS** | `/var/www/app` on `203.0.113.10`, rebuilt into the `app-web` container | **Yes**, on `http://203.0.113.10:3600` |
| **The domain** | `tenant.example` → Caddy → `app-web:3000` | **Yes**, once DNS points at the VPS |

They are independent. You can push to GitHub without deploying, deploy without
pushing, and have both done while the domain still shows a parking page —
which is the situation today.

---

## 0. Access you need

| For | What |
|---|---|
| GitHub | write access to `mabdelma/example` (private) |
| VPS | `ssh vps` — alias for `root@203.0.113.10`, key `~/.ssh/vps_deploy` |
| Domain | a login to the **Tasjeel** control panel |
| Mail | the mailcow admin UI, or its API key |

### The deploy key is installed and working

The VPS clone **can pull from GitHub** via a deploy key at `~/.ssh/example_deploy`
on the VPS (host alias `github-example`, added to **repo → Settings → Deploy
keys** as read/write). Verified 2026-08-14:

```sh
# on the VPS
ssh -T github-example          # → Hi mabdelma/example!
cd /var/www/app && git pull origin main
```

So `git pull` is the normal route for routine updates. Pushing directly over
SSH (section 2) remains the fallback, and works whether or not the key exists.

---

## 1. Commit to GitHub

```sh
git status                       # read it; the tree is often not what you assume
git add -A apps/web              # or the specific paths
git commit -m "…"
git push origin main
```

Only `main` exists, deliberately. The previous project's remote is kept as
`app`, so `git push app …` still reaches Unskinned — check
`git remote -v` before pushing if you are unsure which is which.

Nothing on the server has changed at this point.

---

## 2. Deploy to the VPS

### 2a. Get the code onto the box

```sh
ssh vps
cd /var/www/app && git pull origin main
```

The clone pulls over a deploy key (section 0). The alternative is pushing
directly over SSH, which works because that repo has
`receive.denyCurrentBranch=updateInstead`, checking the new commit out on
receipt. Both routes require a clean tree there — that refusal is a feature,
not an obstacle: it means nobody's manual edit on the server is about to be
silently overwritten.

### 2b. Rebuild the container

```sh
ssh vps
cd /var/www/app
docker compose -f infra/compose/docker-compose.tenant.yml --env-file .env -p tenant up -d --build app-web
```

Omit `app-web` to rebuild the whole stack — ten images, several minutes. For a
web-only change, name the service.

**A failed build changes nothing.** Docker only swaps the container when the
build succeeds, so the previous version keeps serving. This happened twice
during the rebrand and caused no downtime either time. Never "fix" a failed
build by stopping the container first.

Builds take a few minutes, so run them detached and read the log:

```sh
setsid nohup docker compose -f infra/compose/docker-compose.tenant.yml --env-file .env \
  -p tenant up -d --build app-web > /tmp/build.log 2>&1 < /dev/null &

# then
grep -E "Started|Failed to compile|failed to solve|Type error" /tmp/build.log
```

The build runs **lint and typecheck** inside the container. It does **not** run
the test suite. A green deploy is not a green test run.

### 2c. If `schema.prisma` changed — manual, and the dangerous step

Nothing applies the schema for you. The Dockerfile runs `prisma generate`
(client only) and then `npm start`. Deploying code that expects a table which
does not exist gives a 500 on those routes and nothing else warns you.

```sh
# 1. back up FIRST
cd /var/www/app && bash backup.sh

# 2. read the diff and confirm it contains no DROP
docker exec app-web npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel /repo/packages/db/prisma/schema.prisma --script

# 3. apply
docker exec app-web npx prisma db push \
  --schema=/repo/packages/db/prisma/schema.prisma --skip-generate

# 4. back up AGAIN — see below
bash backup.sh
```

`db push` reconciles the database *to* the schema. A model deleted from the
schema is a table deleted from production. Always read the diff.

Back up **after** as well as before. `backup.sh` runs nightly and the deploy
takes one beforehand, which protects against a bad push but leaves the opposite
gap: from a successful schema change until the next nightly run, the newest
structure exists in no backup. A restore test on 2026-08-03 landed in exactly
that window and came back missing a table created thirteen minutes after the
backup.

There are two databases. `tenant` holds the tenant datamodel; `tenant_control` holds
the control plane from its own `control.prisma` and must be pushed separately:

```sh
docker exec app-web npx prisma db push \
  --schema=/repo/packages/db/prisma/control.prisma --skip-generate
```

> **Schema change in this tree.** The `Project` and `Vacancy` models are now in
> `schema.prisma`. **Applied to production 2026-08-14** — the push ran with a
> CREATE-only diff (no `DROP`) and the database was backed up on both sides
> (`2026-08-14-0417` before, `2026-08-14-0421` after). The four routes that read
> the tables (`/projects`, `/careers`, `/central/projects`,
> `/central/vacancies`) are live and serving empty states.

### 2d. Verify — against the served page, not the source

```sh
curl -s -o /dev/null -w "%{http_code}\n" http://203.0.113.10:3600/
curl -s http://203.0.113.10:3600/ | grep -oE "<title>[^<]*</title>"
curl -s -H "Accept-Language: ar" http://203.0.113.10:3600/ | grep -oE '<html[^>]*>'
for r in / /about /services /projects /media /careers /contact; do
  printf "%-12s " $r; curl -s -o /dev/null -w "%{http_code}\n" "http://203.0.113.10:3600$r"
done
```

This is not ceremony. Three defects during the rebrand — a type error, the nav
wordmark, a footer tagline — were invisible to grepping the files that had been
changed, and all three showed up immediately in the served HTML. One of them
was never a brand string in the source at all: the footer rendered
`m.hero.eyebrow`.

---

## 3. Deploy to the domain

The domain is a **DNS and edge** concern. No application change is involved,
and once it is set up it needs no repetition — later code deploys reach the
domain automatically, because Caddy proxies to the same container.

### 3a. DNS, at Tasjeel

`tenant.example` uses `ns5.tasjeel.ae` / `ns6.tasjeel.ae`, so records are edited
in Tasjeel's **Manage DNS** — *not* the nameservers page, which is already
correct and must not be touched. Full record table in
[ROADMAP.md](ROADMAP.md#phase-0--go-live--blocking-not-a-code-change).

The minimum for the website: point the apex and `www` A records at
`203.0.113.10`. Do the MX in the same session — the existing `MX 0
tenant.example` follows the apex, so moving the apex without it sends mail to a
server that will reject it.

```sh
dig +short tenant.example            # want 203.0.113.10
dig +short tenant.example @ns5.tasjeel.ae   # authoritative — skips caching
```

Query the authoritative nameserver when you want to know whether the change was
actually *made*, as opposed to whether it has propagated.

### 3b. Caddy

The vhost is already appended to the shared Caddyfile at
`/var/www/gateway/infrastructure/caddy/Caddyfile` and reloaded. **You should
not need to touch it.** Certificates issue automatically: Caddy retries on a
backoff for up to 30 days, so the site comes up by itself within about a minute
of DNS resolving.

To add a subdomain vhost later (`ai`, `api`, `central`, `workforce` — blocks
are written in `infra/gateway/example.caddy`):

```sh
# edit /var/www/gateway/infrastructure/caddy/Caddyfile, then
docker exec vps-prod-caddy-1 caddy validate --config /etc/caddy/Caddyfile
docker exec vps-prod-caddy-1 caddy reload  --config /etc/caddy/Caddyfile
```

Always `validate` before `reload`. That file also serves example,
partner-five, partner-one, lotsitems and mailcow — a syntax error takes them all down.
A timestamped backup is made before edits; keep doing that.

Check the certificate afterwards. During the failed attempts Caddy fell back to
Let's Encrypt **staging**, and a staging certificate is not browser-trusted:

```sh
curl -sI https://tenant.example | head -1
echo | openssl s_client -connect tenant.example:443 -servername tenant.example 2>/dev/null \
  | openssl x509 -noout -issuer -dates
```

### 3c. Mail

Already configured: `tenant.example` is mailcow's fifth domain, with an `info@`
mailbox, a `noreply@` alias, a DKIM key at selector `dkim`, and
`mail.tenant.example` in `ADDITIONAL_SAN`.

mailcow's certificate job runs **once a day**, unlike Caddy's minute retries.
After DNS lands, force it:

```sh
cd /var/www/mailcow && docker compose restart acme-mailcow
docker logs mailcowdockerized-acme-mailcow-1 --tail 20
```

`No A or AAAA record found for hostname mail.tenant.example` in that log means
DNS is not there yet; it skips the name and leaves the other four domains'
certificates untouched, which is the safe behaviour.

---

## 4. Rollback

```sh
ssh vps && cd /var/www/app
git log --oneline -5
git reset --hard <good-sha>
docker compose -f infra/compose/docker-compose.tenant.yml --env-file .env -p tenant up -d --build app-web
```

A code rollback is cheap. **A schema rollback is not** — `db push` does not
version anything, so reverting code that dropped a column does not bring the
column back. That is what `backup.sh` and the read-the-diff rule are for.

---

## 5. Environment and secrets

`/var/www/app/.env`, mode 600, gitignored, **never** in the tarball or a
commit. `AUTH_SECRET`, `POSTGRES_PASSWORD`, `APP_URL` and `PORTAL_URL` are
declared with `${VAR:?}` in the compose file, so a missing one stops the stack
rather than quietly starting it on the wrong domain.

Changing a secret requires recreating the container — compose only reads `.env`
at create time:

```sh
docker compose -f infra/compose/docker-compose.tenant.yml --env-file .env -p tenant \
  up -d --force-recreate app-web
```

Still empty and silently no-op until filled: Stripe, OpenAI, Google sign-in,
SMTP, VAPID web push, `IMAP_HOST`.

---

## 6. Troubleshooting

**Build fails on a type error.** Read the container's output — it is the honest
check. Locally, `npx tsc --noEmit` is clean (2026-08-14). If the workspace
errors ever return, filter by **error kind**, never by filename. Filtering by
filename is precisely what hid the `LegalEntities` error that broke the first
rebrand build, because the broken file was one nobody thought to edit.

**Push to the VPS is rejected.** The working tree there is dirty. `git -C
/var/www/app status` and resolve it on the server; do not force.

**A route 500s after deploy.** Usually a schema change that was not pushed.
`docker logs app-web --tail 50`.

**The site looks unchanged.** Check you rebuilt rather than only pushing, and
bust the browser cache — icons and fonts are fingerprinted, HTML is not.

**Disk full during build.** The images are ~2.5GB each and there are two full
stacks on this box. `docker builder prune -f` reclaimed 49GB in August 2026.

**Port 3600 is open to the internet.** Docker's iptables rules bypass ufw, so
the app is reachable there over plain HTTP with no certificate. Deliberate:
the mapping stays `"3600:3000"` so the debug door works alongside the domain
(decision 2026-08-14).

---

## 7. The short version

```sh
# 1 — source of record
git add -A && git commit -m "…" && git push origin main

# 2 — the server
ssh vps 'cd /var/www/app && git pull origin main && docker compose \
  -f infra/compose/docker-compose.tenant.yml --env-file .env -p tenant up -d --build app-web'

# 2.5 — only if schema.prisma changed: backup, read the diff, push, backup

# 3 — the domain: nothing, unless DNS or a new subdomain is involved
curl -s -o /dev/null -w "%{http_code}\n" http://203.0.113.10:3600/
```
