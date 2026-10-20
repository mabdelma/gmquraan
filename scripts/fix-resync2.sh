#!/usr/bin/env bash
VOL=/var/lib/docker/volumes/mailcowdockerized_vmail-vol-1/_data
echo "=== removing stale .dovecot.* artifacts ==="
find "$VOL/tenant.example" -name '.dovecot*' -print -delete 2>/dev/null

echo "=== re-resync accountant & operations ==="
for u in accountant operations; do
  docker exec mailcowdockerized-dovecot-mailcow-1 doveadm force-resync -u "$u@tenant.example" '*' >/dev/null 2>&1 \
    && echo "$u OK" || echo "$u STILL FAILS"
done

echo "=== message counts per folder (non-zero) ==="
for u in accountant ceo farm hr info operations sales vp.general-manager; do
  echo "== $u =="
  docker exec mailcowdockerized-dovecot-mailcow-1 doveadm mailbox status -u "$u@tenant.example" messages '*' 2>/dev/null \
    | grep -v 'messages=0'
done
