#!/usr/bin/env bash
# Unskinned pre-launch smoke test — hits production and checks every public surface.
# Usage:  bash scripts/smoketest.sh   [BASE_URL]
set -uo pipefail
BASE="${1:-https://example.com}"
PASS=0; FAIL=0
ok()   { printf "  \033[32mOK\033[0m   %s\n" "$1"; PASS=$((PASS+1)); }
bad()  { printf "  \033[31mFAIL\033[0m %s\n" "$1"; FAIL=$((FAIL+1)); }
code() { curl -s -o /dev/null -m 20 -w "%{http_code}" "$@" 2>/dev/null; }

echo "== Unskinned smoke test :: $BASE =="

echo "-- public pages (expect 200) --"
for p in / /about /services /contact /pricing /marketplace /partners /partner-policy /privacy /terms /hub /login /signup /forgot-password /reset-password /verify; do
  c=$(code "$BASE$p"); [ "$c" = 200 ] && ok "$p" || bad "$p ($c)"
done

echo "-- protected routes (must gate: 307 redirect, or 200 that serves login and never leaks data) --"
for p in /dashboard /onboarding /partner /partner/earnings /central/users /central/revenue; do
  c=$(code "$BASE$p")
  if [ "$c" = 307 ]; then ok "$p -> 307 redirect"
  elif [ "$c" = 200 ]; then
    b=$(curl -s -m 20 "$BASE$p")
    if echo "$b" | grep -qiE "welcome back|saved solutions|demo requests|revenue|payouts|manage users"; then
      bad "$p LEAKS protected content (200)"
    else ok "$p -> 200 soft-redirect (no leak)"; fi
  else bad "$p ($c)"; fi
done

echo "-- APIs: gating & validation --"
for spec in "200:GET:/api/health" "200:GET:/api/version" "200:GET:/api/push/vapid-public-key" \
            "401:GET:/api/v1/me" "401:GET:/api/v1/solutions" "401:GET:/api/cron/alerts" \
            "403:GET:/api/central/product-keys"; do
  exp="${spec%%:*}"; rest="${spec#*:}"; m="${rest%%:*}"; path="${rest#*:}"
  c=$(code -X "$m" "$BASE$path"); [ "$c" = "$exp" ] && ok "$m $path -> $c" || bad "$m $path ($c, expected $exp)"
done
for spec in "400:/api/contact" "400:/api/v1/partners/apply" "400:/api/billing/webhooks/stripe"; do
  exp="${spec%%:*}"; path="${spec#*:}"
  c=$(code -X POST "$BASE$path" -H "content-type: application/json" -d '{}')
  [ "$c" = "$exp" ] && ok "POST $path -> $c" || bad "POST $path ($c, expected $exp)"
done

echo "-- PWA + SEO assets (expect 200) --"
for p in /manifest.webmanifest /sw.js /offline.html /robots.txt /sitemap.xml /icon-192.png /apple-touch-icon.png; do
  c=$(code "$BASE$p"); [ "$c" = 200 ] && ok "$p" || bad "$p ($c)"
done

echo "-- security headers --"
H=$(curl -s -D - -o /dev/null -m 20 "$BASE/")
echo "$H" | grep -qi "strict-transport-security" && ok "HSTS present" || bad "HSTS missing"
echo "$H" | grep -qi "x-content-type-options: nosniff" && ok "nosniff present" || bad "nosniff missing"
echo "$H" | grep -qi "x-powered-by" && bad "X-Powered-By exposed" || ok "X-Powered-By hidden"

echo "-- i18n (Arabic RTL) --"
tag=$(curl -s -m 20 -H "Cookie: app_locale=ar" "$BASE/" | grep -oiE "<html[^>]*>" | head -1)
echo "$tag" | grep -qi 'dir="rtl"' && ok "ar -> dir=rtl" || bad "ar not RTL"

echo "-- host routing --"
c=$(code https://central.example.com/); [ "$c" = 307 ] && ok "central. -> console" || bad "central. ($c)"
c=$(code https://passive.example.com/); [ "$c" = 200 ] && ok "passive. -> Hub" || bad "passive. ($c)"

echo "-- AI advisor (live) --"
r=$(curl -s -m 45 -X POST "$BASE/api/advisor" -H "content-type: application/json" -d '{"message":"What does Unskinned offer?","locale":"en"}')
echo "$r" | grep -q '"success":true' && ok "advisor replied" || bad "advisor: ${r:0:80}"

echo ""
printf "== RESULT: \033[32m%d passed\033[0m, %s ==\n" "$PASS" "$([ $FAIL -eq 0 ] && echo '0 failed' || printf '\033[31m%d failed\033[0m' "$FAIL")"
[ $FAIL -eq 0 ]
