#!/usr/bin/env bash
# Write the full DNS zone for tenant.example on the Tasjeel cPanel host:
#   1. Six A records pointing the domain at the VPS (203.0.113.10)
#   2. The four mail records (MX, SPF, DMARC, DKIM)
#
# Run this ON the cPanel host as the account user (example), or from anywhere:
#   ssh example@203.0.113.20 'bash -s' < scripts/add-mail-dns.sh
#
# The DKIM value comes from mailcow: Configuration -> ARC/DKIM -> key for
# tenant.example (selector dkim). Pass it as the first argument, or the script
# adds everything but DKIM and prints a reminder.
#
#   bash scripts/add-mail-dns.sh "v=DKIM1; k=rsa; p=MIIB..."
set -u

DOMAIN="tenant.example"
VPS_IP="203.0.113.10"
DKIM="${1:-v=DKIM1;k=rsa;t=s;s=email;p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAk7V1DeIDmcCXp8qZZuJYYQ/Lqgl8zRYMyPx6ywppN3dlYIrecySrEnWbGgrbanZK5XG75xJM27i4Bc6b3C7FW+CmZlEgiNj1cpOHOyjXQssKKqqtXB/0FlzsCUOlEnkkTAgW30puZNmDtfL5Lj+CaZ6E/SSF1E3bVEhH/JaoWtm1NYpLf4SYg1Y7ii85YeRmjUAsgY3kLmCSHkGf3/+xJAleOxOJSUxIhFlHZN1VYkxIKnQ5aRju3Uvwxoov45k/snUWV4ZYtmMba/HPFeIHV6k52slpJ0nSUHtXnSaQCBTgHorHPHGJFAocmXyula5ZZ1msPmWYMpWeg2Aq3UuCGQIDAQAB}"
TTL=3600
STATUS=0

say() { printf "\033[1m%s\033[0m\n" "$1"; }

add_record() {
  local desc="$1"; shift
  printf "  ... adding %-32s " "$desc"
  local out
  out=$(uapi ZoneEdit add_zone_record domain="$DOMAIN" ttl="$TTL" "$@" 2>&1)
  if printf '%s' "$out" | grep -q '"status": 1'; then
    printf "OK\n"
  elif printf '%s' "$out" | grep -qi "already exists"; then
    printf "already present, skipping\n"
  else
    printf "FAILED\n"
    printf '%s\n' "$out" | sed 's/^/       /'
    STATUS=1
  fi
}

# Drop any leftover SPF pointing at the old host (two SPF TXTs break validation)
oldspf=$(uapi ZoneEdit fetch_zone domain="$DOMAIN" 2>/dev/null | grep -i "spf.mysecurecloudhost" | grep -oE 'id="[0-9]+"' | grep -oE '[0-9]+' | head -1)
if [ -n "$oldspf" ]; then
  printf "Removing obsolete SPF record id %s...\n" "$oldspf"
  uapi ZoneEdit remove_zone_record domain="$DOMAIN" line="$oldspf" 2>&1 | grep -q '"status": 1' && echo "  removed" || echo "  FAILED to remove"
fi

say "== 1. Pointing the domain at the VPS ($VPS_IP) =="
for host in "$DOMAIN." "www.$DOMAIN." "mail.$DOMAIN." "api.$DOMAIN." "central.$DOMAIN." "workforce.$DOMAIN."; do
  add_record "A ${host} -> $VPS_IP" type=A name="$host" address="$VPS_IP"
done

say ""
say "== 2. Mail records =="
add_record "MX 10 mail.tenant.example" \
  type=MX name="$DOMAIN." priority=10 exchange="mail.$DOMAIN."
add_record "SPF TXT" \
  type=TXT name="$DOMAIN." txtdata="v=spf1 mx a:mail.$DOMAIN. -all"
add_record "DMARC TXT" \
  type=TXT name="_dmarc.$DOMAIN." txtdata="v=DMARC1; p=none; rua=mailto:info@$DOMAIN"
if [ -n "$DKIM" ]; then
  add_record "DKIM TXT (selector dkim)" \
    type=TXT name="dkim._domainkey.$DOMAIN." txtdata="$DKIM"
else
  printf "\n\033[33mSkipped DKIM\033[0m - pass it as an argument:\n"
  printf "  bash %s \"v=DKIM1; k=rsa; p=MIIB...\"\n" "$0"
fi

say ""
say "== Full zone now =="
uapi ZoneEdit fetch_zone domain="$DOMAIN" 2>/dev/null \
  | grep -Ei "^\s+(A|MX|TXT)\s" \
  | grep -Ei "$DOMAIN|dkim|spf|dmarc" \
  | sed 's/^/  /'

printf "\n\033[33mCheck the table above.\033[0m Look for:\n"
printf "  * duplicates of the A records (left by an earlier buggy script)\n"
printf "  * the obsolete SPF value with spf.mysecurecloudhost.com - remove it,\n"
printf "    two SPF TXT records make mail fail validation\n"

printf "\nPropagation usually takes minutes. Verify from your machine:\n"
printf "  nslookup %s 8.8.8.8\n" "$DOMAIN"
printf "  nslookup -type=MX %s 8.8.8.8\n" "$DOMAIN"
printf "  nslookup -type=TXT %s 8.8.8.8\n" "$DOMAIN"

exit "$STATUS"
