#!/bin/bash
cd /var/www/app
docker compose -f infra/compose/docker-compose.prod.yml -p app --env-file .env build app-web app-billing >/tmp/deploy.log 2>&1
docker compose -f infra/compose/docker-compose.prod.yml -p app --env-file .env up -d --force-recreate app-web app-billing >>/tmp/deploy.log 2>&1
echo DEPLOY_DONE >>/tmp/deploy.log
