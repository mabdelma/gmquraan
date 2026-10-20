#!/usr/bin/env bash
set -euo pipefail
BASE='https://mail.example.com/api/v1'
K='${MAILCOW_API_KEY:?set this in your environment}'
H="X-API-Key: $K"

for dom in example.com tenant.example; do
  echo "-- $dom mailboxes:"
  curl -s -H "$H" "$BASE/get/mailbox/all/$dom" | python3 -c '
import sys, json
d = json.load(sys.stdin)
print(" ", len(d), "->", sorted(x["local_part"] for x in d))
'
done

echo "-- domain status:"
for dom in example.com tenant.example; do
  curl -s -H "$H" "$BASE/get/domain/$dom" | python3 -c "
import sys, json
d = json.load(sys.stdin)
r = [x for x in d if isinstance(x, dict)]
print(' ', '$dom', '->', r[0].get('domain_name') if r else d)
"
done

echo "-- aliases:"
curl -s -H "$H" "$BASE/get/alias/all" | python3 -c '
import sys, json
d = json.load(sys.stdin)
print(" ", len(d), "->", [x.get("address") for x in d])
'
