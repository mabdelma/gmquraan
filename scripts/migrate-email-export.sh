#!/usr/bin/env bash
# Phase 1 - inventory the old cPanel mail and arm it for IMAP migration.
# Run ON the Tasjeel cPanel host as the account user (example).
#
# What it does:
#   1. Prints the old IMAP server hostname (that is what imapsync uses for --host1)
#   2. Lists every mailbox, alias/forwarder, catch-all and autoreply
#   3. Sets ONE temporary password on every mailbox so imapsync can log in
#      (the accounts are moving anyway; real passwords are set in mailcow later)
#   4. Writes three files you copy to the VPS:
#        ~/mail-migration/mail-accounts.txt   addr:TEMPPW:TEMPPW  <- edit 3rd field to the real password
#        ~/mail-migration/mail-aliases.txt    alias@d:target@d
#        ~/mail-migration/catchall.txt        target address (or empty)
set -u

DOMAIN="tenant.example"
TEMPPW="MAMgroup!Migrate2026"
OUT="/home/$USER/mail-migration"
mkdir -p "$OUT"

echo "==============================================================="
echo "OLD IMAP HOSTNAME  =  $(hostname -f)"
echo "Use that value as --host1 in the import phase. If it does not"
echo "resolve from the VPS, use the IP 203.0.113.20 instead."
echo "==============================================================="

: > "$OUT/mail-accounts.txt"
: > "$OUT/mail-aliases.txt"
: > "$OUT/catchall.txt"

echo ""
echo "== Mailboxes =="
mapfile -t POPS < <(uapi Email list_pops domain="$DOMAIN" 2>/dev/null | grep -E "^email: " | awk '{print $2}')
if [ "${#POPS[@]}" -eq 0 ]; then
  echo "  (none found)"
fi
for m in "${POPS[@]}"; do
  uapi Email passwd_pop email="$m" password="$TEMPPW" >/dev/null 2>&1 \
    && echo "  $m  -> temp password set" || echo "  $m  -> COULD NOT set password"
  echo "$m:$TEMPPW:$TEMPPW" >> "$OUT/mail-accounts.txt"
done

echo ""
echo "== Aliases / forwarders =="
uapi Email list_forwarders domain="$DOMAIN" 2>/dev/null | grep -E "^forwarder:|^forwarder_destination:" \
  || echo "  (none found)"
uapi Email list_forwarders domain="$DOMAIN" 2>/dev/null > /tmp/fwd.txt
grep "^forwarder:" /tmp/fwd.txt | awk '{print $2}' > /tmp/fwd_src.txt
grep "^forwarder_destination:" /tmp/fwd.txt | awk '{print $2}' > /tmp/fwd_dst.txt
paste -d: /tmp/fwd_src.txt /tmp/fwd_dst.txt >> "$OUT/mail-aliases.txt"

echo ""
echo "== Catch-all (file: /etc/valiases/$DOMAIN) =="
if [ -f "/etc/valiases/$DOMAIN" ]; then
  grep -vE "^\s*#|^\s*$" "/etc/valiases/$DOMAIN" | grep -E "^_|:fail:|:blackhole:" || echo "  (none)"
  grep -E "^_" "/etc/valiases/$DOMAIN" | sed 's/^_: //' > "$OUT/catchall.txt" 2>/dev/null || :
else
  echo "  (no valiases file)"
fi

echo ""
echo "== Autoreplies (not auto-migrated - set these again in mailcow) =="
uapi Email list_autoreplies domain="$DOMAIN" 2>/dev/null | grep -E "email:|subject:|body:" \
  || echo "  (none)"

echo ""
echo "== Files written for the import phase =="
for f in mail-accounts.txt mail-aliases.txt catchall.txt; do
  echo "  $OUT/$f"
  sed 's/^/      /' "$OUT/$f"
done

echo ""
echo "NEXT: edit $OUT/mail-accounts.txt - change the 3rd field of each line"
echo "to the real password you want in mailcow (format addr:OLDPW:NEWPW), then"
echo "copy all three files to the VPS with scp."
