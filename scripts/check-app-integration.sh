#!/usr/bin/env bash
KEY='16117E43E6868CBCB95D130F8D8B9FDC1BDEDA810339B7D4'
echo "=== internal key: get/mailbox/all/tenant.example ==="
curl -sk 'https://mail.example.com/api/v1/get/mailbox/all/tenant.example' -H "X-API-Key: $KEY" \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print(type(d).__name__,len(d))' 2>&1
echo "=== .env mailcow block ==="
grep -n -B2 -A2 'MAILCOW' /var/www/app/.env
echo "=== Dockerfile ==="
cat /var/www/app/apps/web/Dockerfile
echo "=== test file ==="
cat /var/www/app/apps/web/src/lib/__tests__/mailcow.test.ts
