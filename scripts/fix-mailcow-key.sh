#!/usr/bin/env bash
set -e
docker exec mailcowdockerized-mysql-mailcow-1 mysql -umailcow -p'0DypqONoKAoElcwR0HBxxflqThBF' mailcow \
  -e "UPDATE api SET api_key='${MAILCOW_API_KEY:?set this in your environment}', allow_from='0.0.0.0/0' WHERE api_key='${MAILCOW_OLD_API_KEY:?set this in your environment}';"
