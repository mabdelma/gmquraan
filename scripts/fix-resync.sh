#!/usr/bin/env bash
set -uo pipefail
API="https://mail.example.com/api/v1"
KEY="${MAILCOW_API_KEY:?set this in your environment}"
DOMAIN="tenant.example"
DIR="/tmp/mig"

# 1. info@ already existed - set its generated password
pw=$(grep "^info@" "$DIR/mail-new-passwords.txt" | cut -d: -f2)
if [ -n "$pw" ]; then
  out=$(curl -sk -X POST "$API/edit/mailbox" -H "X-API-Key: $KEY" -H "Content-Type: application/json" \
    -d "{\"items\":[\"info@$DOMAIN\"],\"attr\":{\"password\":\"$pw\",\"password2\":\"$pw\"}}")
  printf '%s' "$out" | grep -q '"type":"success"' && echo "info@ password set" || echo "FAILED: $out"
fi

# 2. proper force-resync for every mailbox
while read -r addr; do
  [ -n "$addr" ] || continue
  docker exec mailcowdockerized-dovecot-mailcow-1 doveadm force-resync -u "$addr" '*' >/dev/null 2>&1 \
    && echo "resynced $addr" || echo "RESYNC FAILED $addr"
done < "$DIR/mail-accounts.txt"

# 3. report message counts to verify
echo "=== mailbox status ==="
while read -r addr; do
  [ -n "$addr" ] || continue
  total=$(docker exec mailcowdockerized-dovecot-mailcow-1 doveadm mailbox status -u "$addr" messages 'INBOX' 2>/dev/null | awk '{print $2}')
  echo "$addr INBOX=$total"
done < "$DIR/mail-accounts.txt"
