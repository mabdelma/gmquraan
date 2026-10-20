#!/usr/bin/env bash
VOL=/var/lib/docker/volumes/mailcowdockerized_vmail-vol-1/_data
TAR=/tmp/mig/maildirs.tar.gz

echo "=== leftover mail/virtual in operations? ==="
ls "$VOL/tenant.example/operations/Maildir/mail" 2>/dev/null && echo "PRESENT - removing" \
  && rm -rf "$VOL/tenant.example/operations/Maildir/mail"

echo "=== sieve scripts copied ==="
ls -la "$VOL/sieve/" | grep tenant

echo "=== per-mailbox message counts: archive vs mailcow ==="
total_arch=0; total_disk=0
for u in accountant ceo farm hr info operations sales vp.general-manager; do
  arch=$(tar -tzf "$TAR" 2>/dev/null | grep -cE "^\.?/?$u/MailDir/([^/]*/)*(cur|new)/[^/]+$")
  disk=$(find "$VOL/tenant.example/$u/Maildir" -type f \( -path '*/cur/*' -o -path '*/new/*' \) 2>/dev/null | wc -l)
  printf "  %-18s archive=%-6s disk=%s\n" "$u" "$arch" "$disk"
  total_arch=$((total_arch+arch)); total_disk=$((total_disk+disk))
done
echo "  TOTALS            archive=$total_arch disk=$total_disk"
