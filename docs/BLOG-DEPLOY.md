# Deploying to blog.gmtmall.com

The association site runs as a minimal stack on the shared Hostinger VPS
(`31.97.158.10`), alongside the other GMT Mall apps. Two containers — the
Next.js web app and its own Postgres — reached through the box's existing Caddy.

| | |
|---|---|
| Folder | `/var/www/gmquran` |
| Compose project | `-p blog` |
| Compose file | `infra/compose/docker-compose.blog.yml` |
| Containers | `blog-web`, `blog-postgres` |
| Internal network | `blog_internal` |
| Edge network | `edge` (shared, external) |
| Volumes | `blog_pgdata`, `blog_uploads` |
| Databases | `blog`, `blog_control` on `blog-postgres` |
| Host ports | none — traffic arrives only through Caddy |
| Domain | `blog.gmtmall.com` → `blog-web:3000` |

Nothing here shares a database, volume or network with the other stacks; it can
be stopped, rebuilt or destroyed on its own.

## 1. Get the source onto the box

The box builds web images locally from `/var/www/<project>`, same as the other
apps. Sync the working tree up (the heavy dirs are excluded):

```sh
rsync -az --delete \
  --exclude node_modules --exclude .next --exclude .git \
  --exclude scrape_out \
  ./ qarrito:/var/www/gmquran/
```

## 2. Env

```sh
ssh qarrito
cd /var/www/gmquran
cp .env.blog.example .env
openssl rand -base64 48    # → AUTH_SECRET
openssl rand -base64 32    # → POSTGRES_PASSWORD
$EDITOR .env               # APP_URL is pre-filled with https://blog.gmtmall.com
```

## 3. Build and start

Check disk first — this box runs close to full. Reclaim build cache if needed:

```sh
df -h /
docker builder prune -f          # build cache is safe to drop
cd /var/www/gmquran
BUILDX_NO_DEFAULT_ATTESTATIONS=1 \
  docker compose -f infra/compose/docker-compose.blog.yml --env-file .env -p blog \
  up -d --build --force-recreate blog-web
```

> `BUILDX_NO_DEFAULT_ATTESTATIONS=1` matters. Without it buildx tags
> `blog-blog-web:latest` as a multi-platform **manifest list**, and `compose up`
> then recreates the container from the *previous* image instead of the one it
> just built — the deploy appears to succeed while serving stale code. The flag
> produces a plain image so the recreate uses it. `--force-recreate` guarantees
> the container is replaced even when compose thinks nothing changed. Run this in
> the **foreground**: backgrounding it (`&`, `nohup`, `setsid`) has repeatedly
> been killed after the build but before the recreate, leaving the old container
> up. Let it finish — the build is a couple of minutes.

## 4. Create the schema

Postgres auto-creates only `blog`; the control DB is made by hand. The web app
does not read the control plane (only the workforce portal does, and it is not
deployed), so the second push is for parity rather than need.

```sh
docker exec blog-postgres psql -U blog -d blog -c "CREATE DATABASE blog_control;"
docker exec blog-web npx prisma db push --schema=/repo/packages/db/prisma/schema.prisma  --skip-generate
docker exec blog-web npx prisma db push --schema=/repo/packages/db/prisma/control.prisma --skip-generate
docker restart blog-web
```

## 5. DNS

`blog.gmtmall.com` must resolve to `31.97.158.10` before the next step —
Caddy issues the TLS certificate on first request via an HTTP-01 challenge,
which fails against a host that does not resolve here.

```sh
dig +short blog.gmtmall.com       # → 31.97.158.10
```

## 6. Caddy

Append the vhost and reload (do not restart — reload keeps the other sites up):

```sh
cat /var/www/gmquran/infra/gateway/blog.caddy >> /var/www/qarrito/infrastructure/caddy/Caddyfile
docker exec qarrito-prod-caddy-1 caddy validate --config /etc/caddy/Caddyfile
docker exec qarrito-prod-caddy-1 caddy reload   --config /etc/caddy/Caddyfile
```

## 7. Verify

```sh
docker compose -p blog ps
curl -I https://blog.gmtmall.com          # 200, after the cert issues
```

## Updating later

```sh
# rsync deletes removed files; a tar-pipe (if rsync is unavailable locally) only
# adds/overwrites, so clear the deleted ones by hand when using tar.
rsync -az --delete --exclude node_modules --exclude .next --exclude .git \
  --exclude scrape_out ./ qarrito:/var/www/gmquran/
ssh qarrito 'cd /var/www/gmquran && BUILDX_NO_DEFAULT_ATTESTATIONS=1 \
  docker compose -f infra/compose/docker-compose.blog.yml --env-file .env -p blog \
  up -d --build --force-recreate blog-web'
# verify the swap actually happened — the image id must change:
ssh qarrito 'docker inspect blog-web --format "{{.Image}} {{.State.StartedAt}}"'
# if the Prisma schema changed, re-run the db push from step 4 (back up first).
```
