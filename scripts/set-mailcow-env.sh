#!/usr/bin/env bash
set -euo pipefail
ENVFILE=/var/www/app/.env
URL='https://mail.example.com/api/v1'
KEY='${MAILCOW_API_KEY:?set this in your environment}'
DOMAINS='example.com,tenant.example'

sed -i "s|^MAILCOW_API_URL=.*|MAILCOW_API_URL=$URL|" "$ENVFILE"
sed -i "s|^MAILCOW_API_KEY=.*|MAILCOW_API_KEY=$KEY|" "$ENVFILE"
if grep -q '^MAIL_DOMAINS=' "$ENVFILE"; then
  sed -i "s|^MAIL_DOMAINS=.*|MAIL_DOMAINS=$DOMAINS|" "$ENVFILE"
else
  echo "MAIL_DOMAINS=$DOMAINS" >> "$ENVFILE"
fi
grep -E 'MAILCOW_API_URL|MAILCOW_API_KEY|MAIL_DOMAINS' "$ENVFILE"
