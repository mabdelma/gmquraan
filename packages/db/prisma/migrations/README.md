# Migrations

Squashed to a single baseline on 12 August 2026, with the owner's approval
(decision D-011). `prisma migrate` is now the deployment mechanism; `db push` is
no longer the deploy step.

## Why a squash rather than a repair

The June 2026 chain could not rebuild this database and had not been able to for
six weeks. The last recorded migration was `13_device_tokens` (28 June);
everything after it — TeamMember, ControlledDocument, RepositoryFolder, Company,
AuditEvent, the workflow tables, the tenancy control plane — was applied with
`db push`, which records nothing. Replaying 0→13 produced the June schema.

Three of its files were also unrecorded, its ordinals 10, 11 and 12 were each
used twice, and `0_init/migration.sql` had been destroyed. Repairing that chain
would have meant reconstructing a file nobody has and inventing history to match
checksums. Squashing states the truth instead: this is the schema, as it is.

## What is here

- `20260812010000_squashed_baseline/` — the full current schema, 76 tables,
  generated with `migrate diff --from-empty`. Marked as **already applied** on
  production rather than run; running it would try to create tables that exist.
The sixteen June migrations are kept as history in
`packages/db/prisma/migrations-archive/`, **outside this directory on purpose**.
Prisma treats every subdirectory of `migrations/` as a migration to apply, so an
`archive/` folder nested here is not an archive — it is a pending migration
called "archive". `migrate status` said exactly that, which is how it was
caught.

## Recovering the previous state

The pre-squash `_prisma_migrations` table was copied to
`_prisma_migrations_pre_squash` before anything was changed, and a full database
backup was taken the same minute (`/var/backups/app/db-2026-08-12-0106.sql.gz`).

## From here

    npx prisma migrate dev --name what_changed     # develop
    npx prisma migrate deploy                      # release

A fresh database now gets the baseline and nothing else, which is correct.
