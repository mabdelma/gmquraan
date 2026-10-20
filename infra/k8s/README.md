# Running the Unskinned platform on Kubernetes

```bash
# 1. Create real secrets (don't commit them)
cp secrets.example.yaml secrets.yaml   # edit values
#    …or: kubectl -n app create secret generic app-secrets --from-env-file=../../.env

# 2. Apply everything
kubectl apply -k .

# 3. Run DB migrations once (from a job or locally against the cluster DB)
npm --workspace @app/db run migrate:deploy
```

Layout:
- `namespace.yaml` — the `app` namespace
- `postgres.yaml` — single Postgres StatefulSet (schema-per-service; use a managed DB in prod)
- `services.yaml` — Deployments + Services for auth / catalog / billing / engagement / notifications
- `ingress.yaml` — `api.example.com` path-routed to the services
- `secrets.example.yaml` — Secret + ConfigMap template

For the edge (apex / app / central / ai hosts) use the Caddy gateway in
`infra/gateway/Caddyfile`, or add Ingress rules for the `web` and `agent` Deployments.
