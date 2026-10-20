#!/usr/bin/env bash
# Import raw Maildirs into mailcow - generates the API key and all mailbox
# passwords itself, so nothing has to be typed in. Run ON the VPS.
#
# Expects in DIR (default /tmp/mig):
#   maildirs.tar.gz   produced by the cPanel export (layout <user>/MailDir/...)
#   mail-aliases.txt      optional alias:target lines
#   catchall.txt          optional
#   mail-accounts.txt     optional (if empty/missing, the mailbox list is
#                         derived from the directories inside the archive)
#
# Writes DIR/mail-new-passwords.txt with the generated passwords.
set -uo pipefail

DIR="${1:-/tmp/mig}"
DOMAIN="tenant.example"
API="https://mail.example.com/api/v1"
VOL="/var/lib/docker/volumes/mailcowdockerized_vmail-vol-1/_data"
SIEVEDIR="$VOL/sieve"
STAGE="/tmp/mig/extract"
DBPW='0DypqONoKAoElcwR0HBxxflqThBF'
MC() { docker exec mailcowdockerized-mysql-mailcow-1 mysql -umailcow -p"$DBPW" mailcow -e "$1" 2>/dev/null; }
STATUS=0

say() { printf "\033[1m%s\033[0m\n" "$1"; }

ARCHIVE=""
for cand in "$DIR/maildirs.tar.gz" "$DIR"/*.tar.gz "$DIR"/*.zip; do
  [ -f "$cand" ] && { ARCHIVE="$cand"; break; }
done
[ -n "$ARCHIVE" ] || { echo "missing mail archive in $DIR"; exit 1; }
echo "  archive: $ARCHIVE"

say ""
say "== 0. Extracting archive to staging =="
rm -rf "$STAGE"; mkdir -p "$STAGE"
case "$ARCHIVE" in
  *.zip) unzip -q "$ARCHIVE" -d "$STAGE" ;;
  *)     tar -xzf "$ARCHIVE" -C "$STAGE" ;;
esac
[ "$?" -eq 0 ] || { echo "extraction FAILED"; exit 1; }

# The archive is <user>/MailDir/{cur,new,tmp,...}. Locate each user's Maildir.
USERS=""
for u in "$STAGE"/*/; do
  [ -d "$u" ] || continue
  lp=$(basename "$u")
  md=""
  for c in MailDir maildir Maildir; do [ -d "$u/$c" ] && { md="$u/$c"; break; }; done
  [ -z "$md" ] && continue
  { [ -d "$md/cur" ] || [ -d "$md/new" ] || [ -d "$md/tmp" ]; } || continue
  USERS="$USERS $lp"
done
USERS=$(echo $USERS | tr ' ' '\n' | sort)
if [ -z "$USERS" ]; then echo "  no mailboxes found in archive"; exit 1; fi
echo "  mailboxes: $(echo $USERS | tr '\n' ' ')"

# Accounts file: prefer the export's file, else derive from the archive.
ACCOUNTS="$DIR/mail-accounts.txt"
if [ ! -s "$ACCOUNTS" ]; then
  : > "$ACCOUNTS"
  for lp in $USERS; do echo "$lp@$DOMAIN" >> "$ACCOUNTS"; done
  echo "  (mail-accounts.txt was empty - wrote $ACCOUNTS from the archive)"
fi

say ""
say "== 1. Generating mailcow API key =="
MCKEY=$(openssl rand -hex 24)
MC "INSERT INTO api (api_key, active, allow_from, access) VALUES ('$MCKEY', 1, '0.0.0.0/0', 'rw');" \
  && echo "  key generated" || { echo "  FAILED to create API key"; exit 1; }

say ""
say "== 2. Creating mailboxes with generated passwords =="
: > "$DIR/mail-new-passwords.txt"
while read -r addr; do
  [ -n "$addr" ] || continue
  lp="${addr%%@*}"
  pw=$(openssl rand -base64 18 | tr -dc 'A-Za-z0-9' | head -c 16)
  out=$(curl -sk -X POST "$API/add/mailbox" -H "X-API-Key: $MCKEY" -H "Content-Type: application/json" \
    -d "{\"local_part\":\"$lp\",\"domain\":\"$DOMAIN\",\"password\":\"$pw\",\"password2\":\"$pw\",\"active\":\"1\",\"quota\":\"0\"}")
  echo "$addr:$pw" >> "$DIR/mail-new-passwords.txt"
  if printf '%s' "$out" | grep -q '"type":"success"'; then
    echo "  created $addr"
  elif printf '%s' "$out" | grep -qi "already exists"; then
    out=$(curl -sk -X POST "$API/edit/mailbox" -H "X-API-Key: $MCKEY" -H "Content-Type: application/json" \
      -d "{\"items\":[\"$addr\"],\"attr\":{\"password\":\"$pw\",\"password2\":\"$pw\"}}")
    printf '%s' "$out" | grep -q '"type":"success"' && echo "  $addr exists - password updated" \
      || { echo "  FAILED password update $addr"; echo "$out"; STATUS=1; }
  else
    echo "  FAILED create $addr"; echo "$out"; STATUS=1
  fi
done < "$ACCOUNTS"

say ""
say "== 3. Aliases and catch-all =="
if [ -s "$DIR/mail-aliases.txt" ]; then
  while IFS=: read -r src dst; do
    [ -n "$src" ] || continue
    out=$(curl -sk -X POST "$API/add/alias" -H "X-API-Key: $MCKEY" -H "Content-Type: application/json" \
      -d "{\"address\":\"$src\",\"goto\":\"$dst\",\"active\":\"1\"}")
    printf '%s' "$out" | grep -q '"type":"success"' && echo "  alias $src -> $dst" \
      || { echo "  FAILED alias $src -> $dst"; echo "$out"; STATUS=1; }
  done < "$DIR/mail-aliases.txt"
else
  echo "  (no aliases file)"
fi
if [ -s "$DIR/catchall.txt" ]; then
  tgt=$(grep -vE '^\s*$' "$DIR/catchall.txt" | head -1)
  if [ -n "$tgt" ]; then
    out=$(curl -sk -X POST "$API/edit/domain" -H "X-API-Key: $MCKEY" -H "Content-Type: application/json" \
      -d "{\"items\":[\"$DOMAIN\"],\"attr\":{\"catchall\":\"$tgt\"}}")
    printf '%s' "$out" | grep -q '"type":"success"' && echo "  catch-all -> $tgt" \
      || { echo "  FAILED catch-all"; echo "$out"; STATUS=1; }
  fi
else
  echo "  (no catch-all)"
fi

say ""
say "== 4. Copying Maildirs into mailcow layout =="
for lp in $USERS; do
  md=""
  for c in MailDir maildir Maildir; do [ -d "$STAGE/$lp/$c" ] && { md="$STAGE/$lp/$c"; break; }; done
  [ -z "$md" ] && { echo "  WARN no Maildir for $lp"; continue; }
  mkdir -p "$VOL/$DOMAIN/$lp/Maildir"
  cp -a "$md/." "$VOL/$DOMAIN/$lp/Maildir/" 2>/dev/null
  rm -rf "$VOL/$DOMAIN/$lp/Maildir/tmp"
  mkdir -p "$VOL/$DOMAIN/$lp/Maildir/tmp"
  chmod 700 "$VOL/$DOMAIN/$lp/Maildir"
  # sieve script (best effort)
  if [ -f "$md/sieve/roundcube.sieve" ]; then
    mkdir -p "$SIEVEDIR"
    cp -a "$md/sieve/roundcube.sieve" "$SIEVEDIR/$lp@$DOMAIN.sieve"
    chown 5000:5000 "$SIEVEDIR/$lp@$DOMAIN.sieve"
    echo "  $lp: maildir + sieve copied"
  else
    echo "  $lp: maildir copied"
  fi
done
chown -R 5000:5000 "$VOL/$DOMAIN"

say ""
say "== 5. Dropping old Dovecot index files and rebuilding =="
find "$VOL/$DOMAIN" -name 'dovecot*' -delete 2>/dev/null
find "$VOL/$DOMAIN" -name 'maildirsize' -delete 2>/dev/null
while read -r addr; do
  [ -n "$addr" ] || continue
  docker exec mailcowdockerized-dovecot-mailcow-1 doveadm force-resync -u "$addr" >/dev/null 2>&1 \
    && echo "  resynced $addr" || { echo "  WARN resync failed for $addr"; STATUS=1; }
done < "$ACCOUNTS"

say ""
say "== Done. Generated passwords: $DIR/mail-new-passwords.txt =="
exit "$STATUS"
