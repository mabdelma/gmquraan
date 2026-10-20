#!/usr/bin/env bash
# Unskinned database restore. DESTRUCTIVE — overwrites the live app database.
# Usage:  CONFIRM=yes /var/www/app/restore.sh [/var/backups/app/db-YYYY-MM-DD-HHMM.sql.gz]
#         (no file arg => uses the most recent db-*.sql.gz)
set -euo pipefail
DIR=/var/backups/app
FILE="${1:-$(ls -t "$DIR"/db-*.sql.gz | head -1)}"
[ -f "$FILE" ] || { echo "Backup file not found: $FILE"; exit 1; }
if [ "${CONFIRM:-}" != "yes" ]; then
  echo "Refusing to run without CONFIRM=yes."
  echo "This will WIPE the live app database and restore from:"
  echo "  $FILE"
  echo "Run:  CONFIRM=yes $0 \"$FILE\""
  exit 1
fi
echo "[1/5] Stopping app-web to drop connections…"
docker compose -f /var/www/app/infra/compose/docker-compose.prod.yml -p app --env-file /var/www/app/.env stop app-web || true
echo "[2/5] Terminating remaining connections + recreating database…"
docker exec app-postgres psql -U app -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='app' AND pid<>pg_backend_pid();" >/dev/null
docker exec app-postgres psql -U app -d postgres -c "DROP DATABASE IF EXISTS app;" >/dev/null
docker exec app-postgres psql -U app -d postgres -c "CREATE DATABASE app OWNER app;" >/dev/null
echo "[3/5] Restoring $FILE …"
gunzip -c "$FILE" | docker exec -i app-postgres psql -U app -d app -q
echo "[4/5] Restarting app-web…"
docker compose -f /var/www/app/infra/compose/docker-compose.prod.yml -p app --env-file /var/www/app/.env start app-web
echo "[5/5] Done. Restored from $FILE"
