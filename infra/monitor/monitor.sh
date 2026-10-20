#!/usr/bin/env bash
# Unskinned VPS health monitor — runs via cron (every 5 min). Alerts ops (email) on
# NEW issues and on recovery. Report-only: it does NOT restart neighbours
# (Docker restart policies already self-heal crashes). Dedupes so a persistent
# issue emails once, not every cycle.
#
# Install on the VPS:
#   cp infra/monitor/app-monitor.sh /usr/local/bin/ && chmod +x /usr/local/bin/app-monitor.sh
#   ( crontab -l 2>/dev/null | grep -v app-monitor.sh; \
#     echo "*/5 * * * * /usr/local/bin/app-monitor.sh >> /var/log/app-monitor.log 2>&1" ) | crontab -
# Requires MONITOR_SECRET in /var/www/app/.env (also wired into app-web env so
# the /api/internal/monitor/alert endpoint accepts the same secret).
set -uo pipefail
SECRET="$(grep -E '^MONITOR_SECRET=' /var/www/app/.env 2>/dev/null | cut -d= -f2-)"
ALERT_URL="https://example.com/api/internal/monitor/alert"
STATE=/var/lib/app-monitor/state
IGNORE="vps-prod-nginx-1"   # known-broken healthcheck (service is fine)
mkdir -p /var/lib/app-monitor; touch "$STATE"
P=""
add(){ P="${P}- ${1}
"; }

# ── Reachability ─────────────────────────────────────────────────────────────
# Every public hostname, not two. On 4 August five sites had been unreachable
# for days — the team portal and four others — and this script did not notice,
# because it only checked the marketing site and the console.
check_url(){
  local n="$1" u="$2" c
  c=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$u" 2>/dev/null || echo 000)
  # 000 is a failed connection or TLS handshake, which is exactly how a missing
  # proxy route presents. That is an outage, not a slow page.
  if [ "${c:-000}" = "000" ]; then
    add "UNREACHABLE ${n} (${u}) — connection or TLS failed"
  elif [ "${c:-000}" -lt 200 ] || [ "${c:-000}" -ge 500 ]; then
    add "HTTP ${n} (${u}) returned ${c}"
  fi
}

while IFS='|' read -r name url; do
  [ -n "${name:-}" ] && check_url "$name" "$url"
done <<'SITES'
Unskinned site|https://example.com
Central console|https://central.example.com/central
AI advisor|https://ai.example.com
Team portal|https://workforce.example.com
Notifications|https://ntfy.example.com
Mail|https://mail.example.com
the upstream platform|https://partner-one.example
Qlisted|https://partner-two.example
EntrEquipos|https://partner-three.example
Unskinned Mall|https://partner-four.example
partner-five|https://five.partner-four.example
lotsitems|https://lotsitems.com
SITES

# ── Certificate expiry ───────────────────────────────────────────────────────
# Caddy renews automatically, so this checks that the automation is still
# working rather than reminding anybody to renew by hand. 21 days is generous
# on purpose: it should fire long before anything is at risk.
check_cert(){
  local h="$1" end days
  end=$(echo | openssl s_client -connect "${h}:443" -servername "$h" 2>/dev/null \
        | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
  if [ -z "$end" ]; then add "TLS ${h}: could not read a certificate"; return; fi
  days=$(( ( $(date -d "$end" +%s) - $(date +%s) ) / 86400 ))
  if [ "$days" -lt 0 ]; then
    add "TLS ${h}: certificate EXPIRED ${days#-} day(s) ago"
  elif [ "$days" -lt 21 ]; then
    add "TLS ${h}: certificate expires in ${days} day(s) — renewal may have stopped"
  fi
}
for h in example.com ai.example.com \
         workforce.example.com central.example.com \
         mail.example.com partner-one.example partner-four.example ; do
  check_cert "$h"
done

# ── Backup freshness ─────────────────────────────────────────────────────────
# Nightly jobs, so anything older than 36 hours has missed a run. The extra
# twelve hours absorbs a late start without hiding a genuine miss.
check_backup(){
  local n="$1" d="$2" newest age
  if [ ! -d "$d" ]; then add "BACKUP ${n}: destination ${d} does not exist"; return; fi
  newest=$(find "$d" -type f -printf '%T@\n' 2>/dev/null | sort -rn | head -1)
  if [ -z "$newest" ]; then add "BACKUP ${n}: ${d} is empty"; return; fi
  age=$(( ( $(date +%s) - ${newest%.*} ) / 3600 ))
  [ "$age" -ge 36 ] && add "BACKUP ${n}: newest file in ${d} is ${age}h old"
}

# Destinations named explicitly rather than globbed from /var/backups.
# Globbing produced a false positive on the first run: /var/backups/partner-one is
# a stale directory from a previous arrangement and nothing has written to it
# since June, while the live job writes to /root/backups. A monitor that cries
# wolf about a directory nobody uses gets ignored, and then it misses the one
# that matters — which on that same run was copilot, genuinely dead for 33 days
# because its script had lost its execute bit.
while IFS='|' read -r bname bpath; do
  [ -n "${bname:-}" ] && check_backup "$bname" "$bpath"
done <<'BACKUPS'
Unskinned|/var/backups/app
copilot|/var/backups/copilot
entrequipos|/var/backups/entrequipos
eshop|/var/backups/eshop
vps|/var/backups/vps
qlisted|/var/backups/qlisted
vidmox|/var/backups/vidmox
partner-one|/root/backups
BACKUPS

# ── Containers ───────────────────────────────────────────────────────────────
while IFS=$(printf "\t") read -r name status; do
  echo "$IGNORE" | grep -qw "$name" && continue
  case "$status" in
    *Restarting*) add "Container ${name} is crash-looping: ${status}" ;;
    *unhealthy*)  add "Container ${name} is ${status}" ;;
  esac
done < <(docker ps --format "{{.Names}}	{{.Status}}")

# ── Disk ─────────────────────────────────────────────────────────────────────
# 85, not 90. At 90% on this disk there is under 20 GB left, which is not
# enough warning to do anything considered about it.
USE=$(df / | awk "NR==2{gsub(/%/,\"\",\$5); print \$5}")
[ "${USE:-0}" -ge 85 ] && add "Disk usage at ${USE}% on / — $(df -h / | awk 'NR==2{print $4}') free"

send(){
  local body
  body=$(python3 -c "import json,sys; print(json.dumps({\"subject\":sys.argv[1],\"message\":sys.argv[2]}))" "$1" "$2")
  curl -s -X POST "$ALERT_URL" -H "content-type: application/json" -H "x-monitor-secret: ${SECRET}" -d "$body" >/dev/null 2>&1 || true
}

if [ -n "$P" ]; then
  KEY=$(printf "%s" "$P" | md5sum | cut -d" " -f1)
  if [ "$KEY" != "$(cat "$STATE" 2>/dev/null)" ]; then
    send "Unskinned VPS: issues detected" "$(printf "Health monitor detected issues at %s UTC:\n\n%s" "$(date -u +"%F %T")" "$P")"
    printf "%s" "$KEY" > "$STATE"
  fi
else
  if [ -s "$STATE" ]; then
    send "Unskinned VPS: all systems recovered" "All monitored checks are healthy again as of $(date -u +"%F %T") UTC."
    : > "$STATE"
  fi
fi
