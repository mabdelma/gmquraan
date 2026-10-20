#!/usr/bin/env bash
NS=ns5.tasjeel.ae
DOM=tenant.example
echo "== SOA (serial) =="
dig @$NS $DOM SOA +noall +answer +authority | grep -E 'IN'
echo "== apex A =="
dig @$NS $DOM A +noall +answer | grep -E 'IN'
echo "== MX =="
dig @$NS $DOM MX +noall +answer | grep -E 'IN'
echo "== SPF/TXT apex =="
dig @$NS $DOM TXT +noall +answer | grep -E 'IN'
echo "== subdomains A =="
for h in www mail api central workforce; do
  echo "  $h:"
  dig @$NS $h.$DOM A +noall +answer | grep -E 'IN' | sed 's/^/    /'
done
echo "== DMARC =="
dig @$NS _dmarc.$DOM TXT +noall +answer | grep -E 'IN' | sed 's/^/  /'
echo "== DKIM (dkim._domainkey) =="
dig @$NS dkim._domainkey.$DOM TXT +noall +answer | grep -E 'IN' | sed 's/^/  /'
