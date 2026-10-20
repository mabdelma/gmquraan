#!/bin/sh
# Exercise every catalogue call the advisor's tools make, against the live agent.
B=https://ai.example.com
fail=0

show() {
  code=$(curl -s -o /tmp/r.json -w "%{http_code}" "$B$1")
  printf "%-40s %s  " "$1" "$code"
  python3 - "$2" <<'PY'
import json, sys
want = sys.argv[1]
try:
    d = json.load(open("/tmp/r.json"))
except Exception as e:
    print("UNPARSEABLE", e)
    raise SystemExit(1)

if want == "list":
    items = d.get("data", {}).get("items", [])
    print(f"{len(items)} items -> " + ", ".join(i["slug"] for i in items[:3]))
    raise SystemExit(0 if items else 1)
if want == "one":
    s = d.get("data", {})
    print(f'{s.get("slug")} | {s.get("title")} | {s.get("price")} {s.get("currency")}')
    raise SystemExit(0 if s.get("slug") else 1)
if want == "err":
    print("error =", d.get("error"))
    raise SystemExit(0 if d.get("success") is False else 1)
PY
  [ $? -eq 0 ] || fail=$((fail + 1))
}

echo "--- search_solutions ---"
show "/api/catalog" list
show "/api/catalog?q=ai" list
show "/api/catalog?category=LAUNCH_KIT" list

echo
echo "--- show_solution ---"
show "/api/catalog/ecommerce-store-setup" one

echo
echo "--- a slug we do not carry must fail cleanly, not open a blank panel ---"
show "/api/catalog/does-not-exist" err

echo
echo "--- the proxy must not forward arbitrary parameters ---"
code=$(curl -s -o /tmp/r.json -w "%{http_code}" "$B/api/catalog?q=ai&ownerId=evil&published=false")
printf "%-40s %s  " "param allow-list" "$code"
if grep -q '"items"' /tmp/r.json; then echo "still returns a normal list"; else echo "UNEXPECTED"; fail=$((fail+1)); fi

echo
echo "--- slugs are in the model's instructions ---"
n=$(curl -s "$B/" | grep -o 'slug:' | wc -l)
echo "grounding is server-side, so this checks the page only: $n"

echo
if [ "$fail" -eq 0 ]; then echo "ALL PROBES PASSED"; else echo "$fail PROBE(S) FAILED"; fi
exit $fail
