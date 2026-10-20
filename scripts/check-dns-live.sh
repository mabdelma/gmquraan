#!/usr/bin/env bash
DOM=tenant.example
EXPECT=$(python3 -c "
import re
s = open('/tmp/mig/add-mail-dns.sh').read()
m = re.search(r'DKIM=\"\\\$\{1:-v=DKIM1;[^\"]*?p=([A-Za-z0-9+/=]+)', s)
v = 'v=DKIM1;k=rsa;t=s;s=email;p=' + m.group(1)
print(v)
")
echo "== expected length: ${#EXPECT} =="
echo "== live DKIM (reassembled) =="
LIVE=$(dig @ns5.tasjeel.ae dkim._domainkey.$DOM TXT +short | tr -d '"' | tr -d ' ')
echo "  live length: ${#LIVE}"
if [ "$LIVE" = "$EXPECT" ]; then
  echo "DKIM DNS VALUE MATCH ✓"
else
  echo "DKIM MISMATCH ✗"
  echo "  live:   ${LIVE:0:80}..."
  echo "  expect: ${EXPECT:0:80}..."
fi
echo
echo "== ns6 resync check =="
dig @ns6.tasjeel.ae $DOM SOA +noall +answer | grep -E 'IN' | awk '{print "  serial:", $7}'
echo "== recursive 8.8.8.8 =="
echo "-- MX:"
dig @8.8.8.8 $DOM MX +noall +answer | grep -E 'IN' | sed 's/^/  /'
echo "-- TXT apex:"
dig @8.8.8.8 $DOM TXT +noall +answer | grep -E 'IN' | sed 's/^/  /'
echo "-- serial:"
dig @8.8.8.8 $DOM SOA +noall +answer | grep -E 'IN' | awk '{print "  ", $7}'
