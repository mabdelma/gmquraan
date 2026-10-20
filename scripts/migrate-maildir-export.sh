#!/usr/bin/env bash
# Export every mailbox of tenant.example as raw Maildirs - no passwords, no API key.
# Run ON the old Tasjeel cPanel host as the account user (example).
#
# Produces in ~/mail-migration/:
#   maildirs.tar.gz   one archive; entries already laid out as <user>/Maildir/...
#   mail-accounts.txt     list of addresses
#   mail-aliases.txt      alias:target lines
#   catchall.txt          catch-all target (or empty)
set -u

DOMAIN="tenant.example"
OUT="/home/$USER/mail-migration"
SRC="/home/$USER/mail/$DOMAIN"
mkdir -p "$OUT"

: > "$OUT/mail-accounts.txt"
: > "$OUT/mail-aliases.txt"
: > "$OUT/catchall.txt"

echo "== Mailboxes found under $SRC =="
count=0
for d in "$SRC"/*/; do
  [ -d "$d" ] || continue
  lp=$(basename "$d")
  { [ -d "$d/cur" ] || [ -d "$d/new" ] || [ -d "$d/tmp" ]; } || continue
  echo "  $lp"
  echo "$lp@$DOMAIN" >> "$OUT/mail-accounts.txt"
  count=$((count+1))
done
echo "  ($count mailboxes)"

echo "== Aliases =="
uapi Email list_forwarders domain="$DOMAIN" > /tmp/fwd.txt 2>/dev/null
grep "^forwarder:" /tmp/fwd.txt | awk '{print $2}' > /tmp/fwd_src.txt
grep "^forwarder_destination:" /tmp/fwd.txt | awk '{print $2}' > /tmp/fwd_dst.txt
paste -d: /tmp/fwd_src.txt /tmp/fwd_dst.txt >> "$OUT/mail-aliases.txt" 2>/dev/null
sed 's/^/  /' "$OUT/mail-aliases.txt"

echo "== Catch-all =="
if [ -f "/etc/valiases/$DOMAIN" ]; then
  grep -E "^_" "/etc/valiases/$DOMAIN" | sed 's/^_: //' > "$OUT/catchall.txt" 2>/dev/null || :
fi
sed 's/^/  /' "$OUT/catchall.txt"

echo "== Taring Maildirs (this can take a while) =="
cd "$SRC" || exit 1
tar -czf "$OUT/maildirs.tar.gz" \
  --transform 's,^\./\([^/]*\)/,\1/Maildir/,' \
  --exclude='*/dovecot*' \
  --exclude='*/maildirsize' \
  --exclude='*/tmp' \
  --exclude='*/.imap*' \
  . 2>/dev/null

echo ""
echo "== Done =="
du -h "$OUT/maildirs.tar.gz"
echo ""
echo "NEXT: transfer these four files to a folder on your machine (use the"
echo "cPanel File Manager -> Download, or scp):"
echo "  $OUT/maildirs.tar.gz"
echo "  $OUT/mail-accounts.txt"
echo "  $OUT/mail-aliases.txt"
echo "  $OUT/catchall.txt"
