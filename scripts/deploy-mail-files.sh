#!/usr/bin/env bash
set -euo pipefail
REPO=/var/www/app
D=/tmp/mig/deploy-mail

cp "$D/mailcow.ts"        "$REPO/apps/web/src/lib/mailcow.ts"
cp "$D/page.tsx"          "$REPO/apps/web/src/app/central/mail/page.tsx"
cp "$D/route.ts"          "$REPO/apps/web/src/app/api/central/mail/route.ts"
cp "$D/aliases-route.ts"  "$REPO/apps/web/src/app/api/central/mail/aliases/route.ts"
cp "$D/MailManager.tsx"   "$REPO/apps/web/src/components/MailManager.tsx"
cp "$D/docker-compose.tenant.yml"  "$REPO/infra/compose/docker-compose.tenant.yml"
cp "$D/docker-compose.prod.yml" "$REPO/infra/compose/docker-compose.prod.yml"

echo "=== verify installed (diff against deploy dir) ==="
for f in mailcow.ts page.tsx route.ts MailManager.tsx; do
  base=$(echo "$f" | sed 's|-route\.ts|/route.ts|')
  echo "  $f -> $base"
done
diff "$D/mailcow.ts" "$REPO/apps/web/src/lib/mailcow.ts" && echo "  mailcow.ts OK"
diff "$D/route.ts" "$REPO/apps/web/src/app/api/central/mail/route.ts" && echo "  mail route OK"
diff "$D/aliases-route.ts" "$REPO/apps/web/src/app/api/central/mail/aliases/route.ts" && echo "  aliases route OK"
diff "$D/page.tsx" "$REPO/apps/web/src/app/central/mail/page.tsx" && echo "  page OK"
diff "$D/MailManager.tsx" "$REPO/apps/web/src/components/MailManager.tsx" && echo "  MailManager OK"
