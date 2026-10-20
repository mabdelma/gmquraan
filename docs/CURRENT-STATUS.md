# Unskinned Group — Current Status

_Last updated: 2026-08-14_

## TL;DR

- Email migration from the old Tasjeel cPanel server to **mailcow on the VPS** is complete and verified (8 mailboxes, 2,517 messages).
- Mail server is live on **mail.tenant.example** (webmail + IMAP/SMTP with valid TLS certs).
- The central dashboard (**central.tenant.example/mail**) now shows both domains' mailboxes (multi-domain support deployed).
- **Blocked:** DNS mail records (MX/SPF/DMARC/DKIM) are still NOT published. The cPanel `uapi ZoneEdit` module is broken on the old host, so the automation script cannot run; the four records must be added through the cPanel GUI **Zone Editor**.

---

## 1. Email migration to mailcow — DONE

- 8 mailboxes migrated: `accountant`, `ceo`, `farm`, `hr`, `info`, `operations`, `sales`, `vp.general-manager` + `postmaster` (system) — all active in mailcow DB.
- **2,517 / 2,517 messages** copied (archive vs. per-mailbox disk counts match). Folders, flags, and dates preserved.
- Sieve filters preserved for `accountant` and `operations`.
- Generated mailbox passwords: `/tmp/mig/mail-new-passwords.txt` on the VPS (`vps`). **Keep this safe — it is the only copy of the new passwords.**
- Old-account copy source: `C:\Users\Founder Name\Desktop\opencode\Example\mail-migration.zip` (622 MB) — can be deleted once DNS cutover is confirmed.

## 2. Mail server on mail.tenant.example — DONE

- mailcow hosts 5 domains, including `tenant.example` (added 2026-08-14).
- Webmail returns HTTP 200; IMAP :993, SMTP :465/:587 all return valid certs (`Verify return code: 0`).
- Combined SAN cert (CN `mail.partner-one.example`, SANs incl. `mail.tenant.example`) under `data/assets/ssl/`; Caddy vhost added and reloaded.
- mailcow domain `tenant.example` is at **9/10 mailboxes** (near its cap — raise in mailcow if more are needed).

## 3. Central dashboard multi-domain mail — DONE & DEPLOYED

- `apps/web/src/lib/mailcow.ts` rewritten for multi-domain via `MAIL_DOMAINS` (comma-separated env; default `example.com`). Includes `guard()`, merged `listMailboxes()`, `createMailbox(domain)`, `belongsToDomain()`, aggregated `getDomainStatus()`.
- `apps/web/src/app/central/mail/page.tsx`, `api/central/mail/route.ts`, `api/central/mail/aliases/route.ts`, and `MailManager.tsx` accept a `domain` (domain `<select>` in mailbox + alias forms).
- `.env` on the VPS set:
  - `MAILCOW_API_URL=https://mail.example.com/api/v1`
  - `MAILCOW_API_KEY=<working key>` (same value as `/var/www/app/.env`; a different internal key is known-broken)
  - `MAIL_DOMAINS=example.com,tenant.example`
- `infra/compose/docker-compose.tenant.yml` and `.prod.yml` plumb `MAIL_DOMAINS` through to the container; `.env.tenant.example` documents it.
- `app-web` rebuilt and recreated; running Next.js 15.5.23, HTTP 200, no errors.
- Live check with the app's API key: `example.com` → 22 mailboxes, `tenant.example` → 9 mailboxes (all migrated), both domain statuses OK, aliases incl. `noreply@tenant.example`.
- Unit tests: `apps/web/src/lib/__tests__/mailcow.test.ts` — 11/11 pass; `tsc --noEmit` clean.

## 4. DNS cutover — BLOCKED (needs manual cPanel steps)

### The blocker

- The one-click script `scripts/add-mail-dns.sh` is self-contained and its embedded DKIM was verified byte-for-byte against mailcow (392 chars, selector `dkim`).
- Run on the old cPanel (`example@shams`, `203.0.113.20`) it fails on **every** record:
  `Failed to load module "Cpanel::API::ZoneEdit": Can't locate Cpanel/API/ZoneEdit.pm in @INC`
- The `ZoneEdit` UAPI module is missing/broken on this cPanel install, so `uapi` cannot edit zones. The A records that already point to the VPS were made through the GUI, which uses a different (working) code path.

### Current authoritative zone (ns5/ns6.tasjeel.ae), serial still `2026081432`

| Record | Status |
|---|---|
| A `@` / `www` / `mail` / `api` / `central` / `workforce` → `203.0.113.10` | ✅ present |
| MX `10 mail.tenant.example` | ❌ missing |
| TXT SPF `v=spf1 mx a:mail.tenant.example -all` | ❌ missing |
| TXT `_dmarc` `v=DMARC1; p=none; rua=mailto:info@tenant.example` | ❌ missing |
| TXT `dkim._domainkey` (selector `dkim`) | ❌ missing |

### To finish (manual, ~1 min)

Log into cPanel → **Domains → Zone Editor** → **Manage** `tenant.example` → **Add Record**:

1. **MX** — Name *(blank)*, Priority `10`, Destination `mail.tenant.example`
2. **TXT** — Name *(blank)*, Value `v=spf1 mx a:mail.tenant.example -all`
3. **TXT** — Name `_dmarc`, Value `v=DMARC1; p=none; rua=mailto:info@tenant.example`
4. **TXT** — Name `dkim._domainkey`, Value `v=DKIM1; k=rsa; t=s; s=email; p=<mailcow key, selector dkim>` (full value in `scripts/add-mail-dns.sh`)

Keep TTL at default. After saving, the SOA serial must bump from `2026081432`; verify with `scripts/check-dns-all.sh` (queries both NS + 8.8.8.8).

### Once DNS is live

- Inbound mail for `@tenant.example` flows to mailcow; outbound signed by DKIM, SPF- and DMARC-valid.
- Confirm end-to-end with a real send/receive test to a migrated mailbox.
- Delete `mail-migration.zip` (622 MB) once cutover is confirmed.
- Consider removing the obsolete SPF `include:spf.mysecurecloudhost.com` value if it still exists (two SPF TXT records break validation) — the GUI shows all TXT records; remove any that still reference `spf.mysecurecloudhost`.

---

## Key facts / shortcuts

- VPS: `vps` → `root@203.0.113.10` (key `~/.ssh/vps_deploy`); repo at `/var/www/app`.
- Old cPanel: `example@203.0.113.20`, password-only SSH, `uapi ZoneEdit` broken (use GUI).
- mailcow API base: `https://mail.example.com/api/v1`; key in `/var/www/app/.env`.
- Nameservers: `ns5.tasjeel.ae` / `ns6.tasjeel.ae`.
- Helper scripts (VPS side, `/tmp/mig/` and repo `scripts/`): `check-dns-all.sh`, `check-dns-auth.sh`, `verify-mail.sh`, `check-dkim-match.sh`, `add-mail-dns.sh`.
- Deployment: files scp'd to VPS then `cd /var/www/app/infra/compose && docker compose --env-file /var/www/app/.env -f docker-compose.tenant.yml up -d --build app-web`.
