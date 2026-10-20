#!/usr/bin/env bash
KEY='${MAILCOW_API_KEY:?set this in your environment}'
BASE='https://mail.example.com/api/v1'
echo "=== get/mailbox/tenant.example (status + body) ==="
curl -sk -w '\nHTTP %{http_code}\n' "$BASE/get/mailbox/tenant.example" -H "X-API-Key: $KEY"
echo "=== get/mailbox/info@tenant.example ==="
curl -sk -w '\nHTTP %{http_code}\n' "$BASE/get/mailbox/info@tenant.example" -H "X-API-Key: $KEY"
echo "=== get/domain/tenant.example ==="
curl -sk -w '\nHTTP %{http_code}\n' "$BASE/get/domain/tenant.example" -H "X-API-Key: $KEY"
echo "=== get/alias/noreply@tenant.example ==="
curl -sk -w '\nHTTP %{http_code}\n' "$BASE/get/alias/noreply@tenant.example" -H "X-API-Key: $KEY"
echo "=== api keys in DB ==="
docker exec mailcowdockerized-mysql-mailcow-1 mysql -umailcow -p0DypqONoKAoElcwR0HBxxflqThBF mailcow -e "SELECT api_key, active, allow_from, access FROM api;" 2>/dev/null
