#!/usr/bin/env bash
DOM=tenant.example
for NS in ns5.tasjeel.ae ns6.tasjeel.ae; do
  echo "===== $NS ====="
  echo "-- SOA serial:"
  dig @$NS $DOM SOA +noall +answer | grep -E 'IN' | awk '{print $3, $7}'
  echo "-- MX:"
  dig @$NS $DOM MX +noall +answer | grep -E 'IN' | sed 's/^/  /'
  echo "-- TXT apex (SPF):"
  dig @$NS $DOM TXT +noall +answer | grep -E 'IN' | sed 's/^/  /'
  echo "-- DMARC:"
  dig @$NS _dmarc.$DOM TXT +noall +answer | grep -E 'IN' | sed 's/^/  /'
  echo "-- DKIM:"
  dig @$NS dkim._domainkey.$DOM TXT +noall +answer | grep -E 'IN' | sed 's/^/  /'
done
echo "===== recursive 8.8.8.8 ====="
echo "-- MX:"
dig @8.8.8.8 $DOM MX +noall +answer | grep -E 'IN' | sed 's/^/  /'
echo "-- TXT apex:"
dig @8.8.8.8 $DOM TXT +noall +answer | grep -E 'IN' | sed 's/^/  /'
