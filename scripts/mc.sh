#!/usr/bin/env bash
# mailcow API helper. Usage: mc.sh GET|POST <endpoint> [json-body-file]
set -u
API="https://mail.example.com/api/v1"
KEY="${MAILCOW_API_KEY:?set this in your environment}"
M="$1"; E="$2"; B="${3:-}"
case "$M" in
  GET)
    curl -sk -H "X-API-Key: $KEY" --max-time 20 "$API/$E"
    ;;
  POST)
    if [ -n "$B" ]; then
      curl -sk -X POST -H "X-API-Key: $KEY" -H "Content-Type: application/json" \
        --data-binary @"$B" "$API/$E"
    else
      curl -sk -X POST -H "X-API-Key: $KEY" "$API/$E"
    fi
    ;;
esac
