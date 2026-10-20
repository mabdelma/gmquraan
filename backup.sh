#!/usr/bin/env bash
set -e
D=/var/backups/app
TS=$(date +%F-%H%M)
docker exec app-postgres pg_dump -U app app | gzip > "$D/db-$TS.sql.gz"
docker run --rm -v app_app_uploads:/data:ro -v "$D":/backup alpine tar czf "/backup/uploads-$TS.tgz" -C /data . 2>/dev/null || true
find "$D" -name "db-*.sql.gz" -mtime +14 -delete
find "$D" -name "uploads-*.tgz" -mtime +14 -delete
echo "backup done $TS"
