#!/usr/bin/env bash
set -euo pipefail
SCRIPT=/tmp/mig/add-mail-dns.sh
[ -f "$SCRIPT" ] || SCRIPT=/var/www/app/scripts/add-mail-dns.sh
echo "script: $SCRIPT"
CURRENT=$(curl -s -H 'X-API-Key: ${MAILCOW_API_KEY:?set this in your environment}' \
  'https://mail.example.com/api/v1/get/dkim/tenant.example' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["pubkey"])')
EMBEDDED=$(python3 -c "
import re
s = open('$SCRIPT').read()
m = re.search(r'DKIM=\"\\\$\{1:-v=DKIM1;[^\"]*?p=([A-Za-z0-9+/=]+)', s)
print(m.group(1))
")
echo "embedded len: ${#EMBEDDED}"
echo "current  len: ${#CURRENT}"
if [ "$EMBEDDED" = "$CURRENT" ]; then
  echo "DKIM MATCH - safe to publish"
else
  echo "DKIM MISMATCH"
  python3 -c "
a='$EMBEDDED'; b='$CURRENT'
print(' embedded head:', a[:80])
print(' current  head:', b[:80])
i = next((k for k,(x,y) in enumerate(zip(a,b)) if x!=y), min(len(a),len(b)))
print(' first diff at', i, 'embedded=', a[i:i+30], 'current=', b[i:i+30])
"
fi
