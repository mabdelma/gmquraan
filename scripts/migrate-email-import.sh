#!/usr/bin/env bash
# Phase 2 - create the mailboxes/aliases in mailcow and sync every mailbox
# from the old cPanel server via IMAP. Run ON the VPS (where mailcow lives).
#
# Setup (one time):
#   1. mailcow UI -> System -> API keys -> Add -> read-write -> copy the key
#   2. Get the three files the export phase produced (edit the 3rd field of
#      mail-accounts.txt to the real passwords first):
#        scp user@OLD:/home/USER/mail-migration/mail-accounts.txt /tmp/mig/
#        scp user@OLD:/home/USER/mail-migration/mail-aliases.txt  /tmp/mig/
#        scp user@OLD:/home/USER/mail-migration/catchall.txt      /tmp/mig/
#
# Run:
#   MAILCOW_APIKEY=... OLDSRV=... TEMPPW='MAMgroup!Migrate2026' \
#     bash scripts/migrate-email-import.sh /tmp/mig
set -u

API="https://mail.partner-three.example/api/v1"
KEY="${MAILCOW_APIKEY:-}"
OLDSRV="${OLDSRV:-}"
TEMPPW="${TEMPPW:-}"
DOMAIN="tenant.example"
DIR="${1:-/tmp/mig}"
STATUS=0

[ -n "$KEY" ]  || { echo "missing MAILCOW_APIKEY"; exit 1; }
[ -n "$OLDSRV" ] || { echo "missing OLDSRV (old cPanel hostname or 203.0.113.20)"; exit 1; }
[ -n "$TEMPPW" ] || { echo "missing TEMPPW (temp password set on the old server)"; exit 1; }
[ -f "$DIR/mail-accounts.txt" ] || { echo "no $DIR/mail-accounts.txt"; exit 1; }

say() { printf "\033[1m%s\033[0m\n" "$1"; }

mc() { # mc <endpoint> <json>  -> POST to the mailcow API
  curl -sk -X POST "$API/$1" -H "X-API-Key: $KEY" \
    -H "Content-Type: application/json" -d "$2"
}

create_mailbox() {
  local lp="$1" pw="$2" out
  out=$(mc "add/mailbox" "{\"local_part\":\"$lp\",\"domain\":\"$DOMAIN\",\"password\":\"$pw\",\"password2\":\"$pw\",\"quota\":\"0\",\"active\":\"1\"}")
  if printf '%s' "$out" | grep -q '"type":"success"'; then
    echo "    mailbox $lp@$DOMAIN created"
  elif printf '%s' "$out" | grep -qi "already exists"; then
    out=$(mc "edit/mailbox" "{\"items\":[\"$lp@$DOMAIN\"],\"attr\":{\"password\":\"$pw\",\"password2\":\"$pw\"}}")
    printf '%s' "$out" | grep -q '"type":"success"' && echo "    mailbox $lp@$DOMAIN exists - password updated" \
      || { echo "    FAILED to update password for $lp@$DOMAIN"; echo "$out"; STATUS=1; }
  else
    echo "    FAILED to create $lp@$DOMAIN"; echo "$out"; STATUS=1
  fi
}

sync_mailbox() {
  local user="$1" pw="$2" lp="${1%%@*}"
  echo "    imapsync $user ..."
  docker run --rm gilleslamiral/imapsync \
    --host1 "$OLDSRV" --user1 "$user" --pass1 "$TEMPPW" --ssl1 \
    --host2 127.0.0.1 --port2 993 --user2 "$user" --pass2 "$pw" --ssl2 \
    --syncinternaldates --skipcrossduplicates --nofoldersizes \
    --addheader "X-Imapsync: migration" \
    || { echo "    imapsync FAILED for $user"; STATUS=1; }
}

say "== Creating mailboxes in mailcow =="
while IFS=: read -r addr oldpw newpw; do
  [ -n "$addr" ] || continue
  lp="${addr%%@*}"
  create_mailbox "$lp" "$newpw"
done < "$DIR/mail-accounts.txt"

say ""
say "== Syncing messages from $OLDSRV =="
while IFS=: read -r addr oldpw newpw; do
  [ -n "$addr" ] || continue
  sync_mailbox "$addr" "$newpw"
done < "$DIR/mail-accounts.txt"

say ""
say "== Aliases =="
if [ -f "$DIR/mail-aliases.txt" ]; then
  while IFS=: read -r src dst; do
    [ -n "$src" ] || continue
    out=$(mc "add/alias" "{\"address\":\"$src\",\"goto\":\"$dst\",\"active\":\"1\"}")
    printf '%s' "$out" | grep -q '"type":"success"' && echo "    alias $src -> $dst" \
      || { echo "    FAILED alias $src -> $dst"; echo "$out"; STATUS=1; }
  done < "$DIR/mail-aliases.txt"
else
  echo "    (no aliases file)"
fi

say ""
say "== Catch-all =="
if [ -f "$DIR/catchall.txt" ]; then
  target=$(grep -vE "^\s*$" "$DIR/catchall.txt" | head -1)
  if [ -n "$target" ]; then
    out=$(mc "edit/domain" "{\"items\":[\"$DOMAIN\"],\"attr\":{\"catchall\":\"$target\"}}")
    printf '%s' "$out" | grep -q '"type":"success"' && echo "    catch-all -> $target" \
      || { echo "    FAILED catch-all -> $target"; echo "$out"; STATUS=1; }
  else
    echo "    (none)"
  fi
fi

say ""
say "== Done. Verify =="
echo "    mailcow: check quotas/messages in UI (Quarantine -> mailbox quota)"
echo "    nslookup -type=MX $DOMAIN 8.8.8.8   -> must be 10 mail.$DOMAIN"
echo "    When MX is live, restart acme:"
echo "      cd /var/www/mailcow && docker compose restart acme-mailcow"

exit "$STATUS"
