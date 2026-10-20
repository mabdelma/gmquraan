# Archived migrations — not the deployment mechanism

These SQL files are **historical**. This stack deploys its schema with
`prisma db push`, which reconciles the database to `schema.prisma` and never
reads this directory. See `DEPLOY.md` → "Schema changes".

They were moved out of `prisma/migrations/` because leaving them there was a
live hazard: `prisma migrate deploy` auto-discovers that exact path, and three
of these folders — `10_account_2fa`, `11_platform_depth`, `12_domain_events` —
were never recorded in `_prisma_migrations`. Anyone running `migrate deploy`
would have applied them blind to a database whose schema had already moved on
via `db push`.

The `_prisma_migrations` table in production is likewise vestigial: it records
14 entries, while the live schema also contains `Notification`, `DomainEvent`,
`Post`, `Quote`, `User.emailAlerts` and `User.totpSecret` — all applied by
`db push` without a record.

To adopt versioned migrations later, baseline from the current database rather
than replaying these:

    npx prisma migrate diff \
      --from-empty --to-schema-datamodel packages/db/prisma/schema.prisma \
      --script > packages/db/prisma/migrations/0_baseline/migration.sql
    npx prisma migrate resolve --applied 0_baseline
