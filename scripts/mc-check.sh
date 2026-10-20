#!/usr/bin/env bash
echo "=== mailboxes on tenant.example ==="
bash /tmp/mc.sh GET "get/mailbox/tenant.example" | head -c 1500
echo
echo "=== aliases ==="
bash /tmp/mc.sh GET "get/alias/all" | grep -oE '"address"[^,]*' | sort -u
echo
echo "=== all domains ==="
bash /tmp/mc.sh GET "get/domain/all" | grep -oE '"domain_name"[^,]*' | sort -u
