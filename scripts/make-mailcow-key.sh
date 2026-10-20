#!/usr/bin/env bash
set -e
MCKEY=$(openssl rand -hex 24)
HASH=$(printf '%s' "$MCKEY" | sha256sum | awk '{print $1}')
docker exec mailcowdockerized-mysql-mailcow-1 mysql -umailcow -p'0DypqONoKAoElcwR0HBxxflqThBF' mailcow \
  -e "INSERT INTO api (api_key, active, allow_from) VALUES ('$HASH', 1, '');"
echo "APIKEY=$MCKEY"
