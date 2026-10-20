#!/usr/bin/env bash
DOM=tenant.example
EXPECT=$(python3 -c "
import re
s = open('/tmp/mig/add-mail-dns.sh').read()
m = re.search(r'DKIM=\"\\\$\{1:-v=DKIM1;[^\"]*?p=([A-Za-z0-9+/=]+)', s)
print('v=DKIM1;k=rsa;t=s;s=email;p=' + m.group(1))
")
LIVE=$(dig @ns5.tasjeel.ae dkim._domainkey.$DOM TXT +short | tr -d '"')
export EXPECT LIVE
python3 - <<'PY'
import os
expect = os.environ['EXPECT']
live = os.environ['LIVE']
live_clean = live.replace('\n', '').replace(' ', '')
print("expect len:", len(expect))
print("live raw len:", len(live), "| live cleaned len:", len(live_clean))
diffs = [(i, e, l) for i, (e, l) in enumerate(zip(expect, live_clean)) if e != l]
print("diff count:", len(diffs))
for i, e, l in diffs[:20]:
    print(f"  pos {i}: expect={e!r} live={l!r}")
    print(f"    expect ctx: {expect[max(0,i-10):i+12]}")
    print(f"    live   ctx: {live_clean[max(0,i-10):i+12]}")
PY
