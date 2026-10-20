#!/usr/bin/env bash
# Deploy Unskinned on the Qarrito VPS via Docker Compose on the shared `edge` network.
# Run ON the VPS:  cd /var/www/app && ./scripts/deploy-vps.sh
set -euo pipefail

cd "$(dirname "$0")/.."
COMPOSE="docker compose -f infra/compose/docker-compose.prod.yml -p app"

# 1. First-run .env with generated secrets (kept out of git).
if [ ! -f .env ]; then
  echo "==> generating .env"
  cat > .env <<EOF
AUTH_SECRET=$(openssl rand -hex 32)
POSTGRES_PASSWORD=$(openssl rand -hex 16)
# Optional integrations — fill later and re-run:
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_GROWTH_PRICE_ID=
OPENAI_API_KEY=
SMTP_HOST=
SMTP_PORT=587
EMAIL_FROM=Unskinned <noreply@example.com>
EOF
fi

# 2. Build images one at a time (keeps peak RAM low on a shared box).
for svc in app-postgres app-notifications app-auth app-catalog app-billing app-engagement app-agent app-web; do
  echo "==> building ${svc}"
  $COMPOSE --env-file .env build "${svc}" || true
done

# 3. Bring it up.
echo "==> starting stack"
$COMPOSE --env-file .env up -d

# 4. Wait for Postgres, then create the schema + seed.
echo "==> waiting for postgres"
until docker exec app-postgres pg_isready -U app -d app >/dev/null 2>&1; do sleep 2; done
echo "==> prisma db push"
docker exec app-web npx prisma db push --schema /repo/packages/db/prisma/schema.prisma --skip-generate
echo "==> seeding"
docker exec app-web npx tsx /repo/packages/db/prisma/seed.ts || true

echo "==> done. Containers:"
$COMPOSE ps
