#!/usr/bin/env bash
curl -sk 'https://mail.example.com/api/v1/get/mailbox/tenant.example' \
  -H 'X-API-Key: ${MAILCOW_API_KEY:?set this in your environment}' \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print("count:",len(d));[print(" ",m.get("username"),"active=",m.get("active"),"quota=%sMiB"%(m.get("quota")//1048576)) for m in d]' 2>/dev/null || echo "API FAILED"
echo "---central vhost---"
grep -n -A6 'central\.tenant' /var/www/gateway/infrastructure/caddy/Caddyfile
echo "---central container---"
docker ps --format '{{.Names}}\t{{.Image}}\t{{.Status}}' | grep -i central
