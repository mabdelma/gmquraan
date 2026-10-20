#!/bin/sh
# End-to-end checks against the deployed portal, run from inside the app network.
B=http://app-workforce:3002
fail=0
chk() { # name expected actual
  # An empty actual is a broken probe, not a pass — two empty strings compare
  # equal, which is how a dead check reports success.
  if [ -z "$3" ]; then echo "FAIL  $1 (empty response — probe did not run)"; fail=$((fail+1)); return; fi
  if [ "$2" = "$3" ]; then echo "PASS  $1"; else echo "FAIL  $1 (expected $2, got $3)"; fi
  [ "$2" = "$3" ] || fail=$((fail+1))
}

echo "--- probe reaches the portal at all ---"
probe=$(curl -s -o /dev/null -w "%{http_code}" "$B/")
if [ "$probe" != "200" ]; then echo "FAIL  base URL returned '$probe' — nothing below is meaningful"; exit 1; fi
echo "PASS  base URL returns 200"
echo

echo "--- guards: every authenticated page must redirect a signed-out visitor ---"
for p in /home /tasks /me /team /approvals /admin; do
  out=$(curl -s -o /dev/null -w "%{http_code} %{redirect_url}" "$B$p")
  code=$(echo "$out" | cut -d' ' -f1)
  loc=$(echo "$out" | cut -d' ' -f2-)
  case "$loc" in */) short="/" ;; *) short="$loc" ;; esac
  if [ "$code" = "307" ] || [ "$code" = "302" ] || [ "$code" = "303" ]; then
    echo "PASS  $p redirects ($code -> ${loc:-/})"
  else
    echo "FAIL  $p returned $code, expected a redirect"; fail=$((fail+1))
  fi
done

echo
echo "--- API routes reject a signed-out caller ---"
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$B/api/me" -d "name=Hacker")
chk "POST /api/me without a session" "303" "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$B/api/tasks/abc/state" -d "to=COMPLETED")
chk "POST /api/tasks/:id/state without a session" "303" "$code"

echo
echo "--- bad credentials are refused, and say nothing useful ---"
body=$(curl -s -o /dev/null -w "%{redirect_url}" -X POST "$B/api/login" \
  -d "email=nobody@example.com&password=wrongpassword")
case "$body" in
  *error=*) echo "PASS  unknown account rejected" ;;
  *) echo "FAIL  unknown account did not produce an error redirect: $body"; fail=$((fail+1)) ;;
esac
case "$body" in
  *"not+accepted"*|*"not%20accepted"*) echo "PASS  generic message (no account enumeration)" ;;
  *) echo "WARN  check the message is generic: $body" ;;
esac

echo
echo "--- a real member with a wrong password gets the same generic message ---"
body2=$(curl -s -o /dev/null -w "%{redirect_url}" -X POST "$B/api/login" \
  -d "email=founder@example.com&password=definitelywrong")
m1=$(echo "$body" | sed 's/.*error=//;s/&.*//')
m2=$(echo "$body2" | sed 's/.*error=//;s/&.*//')
chk "same message for known and unknown accounts" "$m1" "$m2"

echo
echo "--- magic link never reveals whether the address exists ---"
r1=$(curl -s -o /dev/null -w "%{redirect_url}" -X POST "$B/api/magic" -d "email=founder@example.com")
r2=$(curl -s -o /dev/null -w "%{redirect_url}" -X POST "$B/api/magic" -d "email=nosuchperson@example.com")
s1=$(echo "$r1" | sed 's/.*\(sent=1\).*/\1/')
s2=$(echo "$r2" | sed 's/.*\(sent=1\).*/\1/')
chk "identical response for member and non-member" "$s1" "$s2"

echo
echo "--- an expired or forged sign-in link is refused ---"
body3=$(curl -s -o /dev/null -w "%{redirect_url}" "$B/signin/not-a-real-token")
case "$body3" in
  *error=*) echo "PASS  forged token rejected" ;;
  *) echo "FAIL  forged token was not rejected: $body3"; fail=$((fail+1)) ;;
esac

echo
echo "--- security headers ---"
h=$(curl -sI "$B/")
for want in "x-frame-options: DENY" "content-security-policy" "cache-control: no-store" "referrer-policy: no-referrer"; do
  if echo "$h" | tr 'A-Z' 'a-z' | grep -qi "$want"; then echo "PASS  $want"; else echo "FAIL  missing $want"; fail=$((fail+1)); fi
done

echo
echo "--- orchestrator ---"
run=$(curl -s -X POST http://app-orchestrator:8080/v1/orchestrator/run)
case "$run" in
  *'"errors":[]'*) echo "PASS  full cycle ran with no errors" ;;
  *) echo "FAIL  orchestrator reported errors: $run"; fail=$((fail+1)) ;;
esac
echo "$run" | tr ',' '\n' | grep -o '"name":"[a-zA-Z]*"' | sed 's/"name":"/      tick: /;s/"//'

echo
if [ "$fail" -eq 0 ]; then echo "ALL CHECKS PASSED"; else echo "$fail CHECK(S) FAILED"; fi
exit $fail
