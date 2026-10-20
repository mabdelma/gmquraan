#!/usr/bin/env bash
echo "=== raw API get/mailbox/tenant.example ==="
curl -sk 'https://mail.example.com/api/v1/get/mailbox/tenant.example' \
  -H 'X-API-Key: ${MAILCOW_API_KEY:?set this in your environment}' | head -c 500; echo
echo "=== raw API get/mailbox (all) ==="
curl -sk 'https://mail.example.com/api/v1/get/mailbox' \
  -H 'X-API-Key: ${MAILCOW_API_KEY:?set this in your environment}' | head -c 2000; echo
echo "=== DB: domain ==="
docker exec mailcowdockerized-mysql-mailcow-1 mysql -umailcow -p0DypqONoKAoElcwR0HBxxflqThBF mailcow -e "SELECT domain, active FROM domain WHERE domain='tenant.example';" 2>/dev/null
echo "=== DB: mailbox count ==="
docker exec mailcowdockerized-mysql-mailcow-1 mysql -umailcow -p0DypqONoKAoElcwR0HBxxflqThBF mailcow -e "SELECT username, active FROM mailbox ORDER BY username;" 2>/dev/null
echo "=== DB: aliases ==="
docker exec mailcowdockerized-mysql-mailcow-1 mysql -umailcow -p0DypqONoKAoElcwR0HBxxflqThBF mailcow -e "SELECT address, goto FROM alias ORDER BY address;" 2>/dev/null
