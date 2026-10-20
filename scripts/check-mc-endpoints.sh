#!/usr/bin/env bash
KEY='${MAILCOW_API_KEY:?set this in your environment}'
B='https://mail.example.com/api/v1'
echo "=== /get/mailbox/all/tenant.example ==="
curl -sk "$B/get/mailbox/all/tenant.example" -H "X-API-Key: $KEY" \
  | python3 -c 'import sys,json
d=json.load(sys.stdin)
print(type(d).__name__, len(d))
if isinstance(d,list):
  for m in d[:12]: print("  ", m.get("username"))'
echo "=== /get/mailbox/all/example.com ==="
curl -sk "$B/get/mailbox/all/example.com" -H "X-API-Key: $KEY" \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print(type(d).__name__,len(d))'
echo "=== /get/alias/all ==="
curl -sk "$B/get/alias/all" -H "X-API-Key: $KEY" \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print(type(d).__name__,len(d))'
