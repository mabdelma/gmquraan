#!/usr/bin/env bash
set -euo pipefail
CADDYFILE=/var/www/gateway/infrastructure/caddy/Caddyfile

if grep -q '^mail\.tenant\.ae {' "$CADDYFILE"; then
  echo "mail.tenant.example vhost already present"
else
  cat >> "$CADDYFILE" <<'EOF'

# === tenant.example mail (webmail + ACME validation) ===
mail.tenant.example {
	encode gzip zstd
	reverse_proxy https://mailcowdockerized-nginx-mailcow-1 {
		transport http {
			tls_insecure_skip_verify
		}
		header_up Host {host}
		header_up X-Forwarded-Proto https
	}
}
EOF
  echo "mail.tenant.example vhost added"
fi

# validate + reload Caddy
docker exec vps-prod-caddy-1 caddy validate --config /etc/caddy/Caddyfile >/dev/null 2>&1 \
  && docker exec vps-prod-caddy-1 caddy reload --config /etc/caddy/Caddyfile 2>&1 \
  && echo "Caddy reloaded OK"
