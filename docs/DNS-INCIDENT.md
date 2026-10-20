# Going live on tenant.example — what went wrong and what was changed

A record of the domain cutover on 2026-08-14: why it took most of a day, every
adjustment made, and how to avoid repeating it.

The short version: **the domain was fine, the server was fine, and DNS records
were fine — but rarely at the same time, in the same place.** Three separate
DNS systems were involved and the records kept being written to whichever one
was not currently authoritative.

---

## The core misunderstanding

Two things get called "hosting" and they are unrelated:

| | What it is | Where it was |
|---|---|---|
| **Web hosting** | the machine running the site | Hostinger VPS, `203.0.113.10` |
| **DNS hosting** | the phone book saying where the site is | Tasjeel, then Hostinger, then Tasjeel again |

Pointing the domain "to Hostinger" is an **A record value**, not a nameserver
choice. The A records said `203.0.113.10` for most of the day. What kept
changing — and kept being wrong — was which nameservers the world was told to
ask.

---

## Three DNS systems, one domain

This is what made it genuinely confusing rather than merely slow.

| System | Nameservers | Held |
|---|---|---|
| Tasjeel classic DNS | `ns5` / `ns6.tasjeel.ae` | the cPanel account's zone |
| Tasjeel "new DNS Manager" | `ns3` / `ns4.tasjeel.ae` | a separately-authored zone |
| Hostinger | `ns1` / `ns2.dns-parking.com` | **nothing** |

Records edited in one system are invisible unless the registry delegation
points at that system's nameservers. At various points during the day, it
pointed at all three — and the zones themselves swapped contents between the
`ns3/ns4` and `ns5/ns6` pairs when the nameservers were changed, because
changing them caused the cPanel account's zone to be provisioned onto the newly
active pair.

### Timeline

1. **Start.** Delegation `ns5/ns6`. Apex → `203.0.113.20` (Tasjeel cPanel
   shared hosting, serving an empty `Index of /`). This was always a live
   hosting account, not a "parking page".
2. **Nameservers changed to `ns1/ns2.dns-parking.com`.** Hostinger's
   nameservers only serve domains inside a Hostinger account, and this domain
   was not in one. They answered `NXDOMAIN`. **The domain went completely dark
   — no website, no email, for everyone.**
3. Records were authored in the new DNS Manager, which publishes on `ns3/ns4` —
   still not the delegated pair, so still invisible.
4. **Delegation moved to `ns3/ns4`.** The domain resolved again, but the act of
   switching provisioned the cPanel zone onto `ns3/ns4`, overwriting the good
   records with `203.0.113.20`. The good zone ended up on `ns5/ns6`.
5. **Delegation moved to `ns5/ns6`** — which by then held the correct records.
   This is the final, working configuration.
6. Resolver caches then took hours to expire, because the superseded records
   carried a **14400-second (4-hour) TTL**.

### The red herring: a cPanel URL redirect

Throughout, a cPanel redirect was in place:

```
301 Moved Permanently
Location: http://203.0.113.10:3600/
```

It was registered as a `rewrite` redirect on `/` for `tenant.example`, implemented
as a `RewriteRule` in `~/public_html/.htaccess`.

This is why the domain appeared to "forward to an IP and port". Anyone whose
resolver still pointed at the cPanel host was bounced there. It also made every
diagnosis ambiguous: the same symptom could mean stale DNS, a browser-cached
301, or the redirect itself.

It has been removed. `uapi Mime list_redirects` now returns `data: []` and the
host returns `200` with no `Location` header.

---

## Final DNS configuration

**Nameservers (set at the registrar):**

```
ns5.tasjeel.ae
ns6.tasjeel.ae
```

**Zone** — verified against both authoritative IPs (`203.0.113.40`,
`203.0.113.50`), single record each, serial `2026081432`:

| Name | Type | TTL | Value |
|---|---|---|---|
| `@` | A | 3600 | `203.0.113.10` |
| `www` | A | 3600 | `203.0.113.10` |
| `mail` | A | 3600 | `203.0.113.10` |
| `api` | A | 3600 | `203.0.113.10` |
| `central` | A | 3600 | `203.0.113.10` |
| `workforce` | A | 3600 | `203.0.113.10` |

**Not yet added** — email will not work until these exist:

| Name | Type | Value |
|---|---|---|
| `@` | MX | `10 mail.tenant.example` |
| `@` | TXT | `v=spf1 mx a:mail.tenant.example -all` |
| `_dmarc` | TXT | `v=DMARC1; p=none; rua=mailto:info@tenant.example` |
| `dkim._domainkey` | TXT | the key generated in mailcow, selector `dkim` |

---

## Everything that was changed

### Registrar / DNS
- Nameservers moved `ns5/ns6` → `dns-parking` → `ns3/ns4` → **`ns5/ns6`**
- Six A records pointed at the VPS
- The old SPF (`ip4:203.0.113.20 include:spf.mysecurecloudhost.com`) is
  obsolete — it authorises the wrong sender and should be replaced

### cPanel (`example@shams`, `203.0.113.20`)
- Deleted the `301` redirect to `203.0.113.10:3600`
- Stripped the corresponding `RewriteRule` from `~/public_html/.htaccess`
  (backups kept as `.htaccess.bak-<timestamp>`)
- Two orphaned `RewriteCond` lines remain with no rule after them; harmless,
  ignored by the server, tidy at leisure
- **This account hosts nothing.** The site runs on the VPS; the cPanel account
  is only a DNS side-effect. If it is a paid add-on, it is paying for an idle
  server.

### Edge / Caddy (shared, `/var/www/gateway/infrastructure/caddy/Caddyfile`)
- Added vhosts for `tenant.example`, `www`, `central`, `workforce`, `api`
- Timestamped backups taken before each edit
- Cleared five stale `issue_cert_*tenant*` lock files that were blocking
  certificate issuance, and restarted Caddy to reset a 20-minute backoff and a
  drift onto the Let's Encrypt **staging** CA
- Certificates now issued from **production** Let's Encrypt, valid to
  **12 November 2026**, covering all five hostnames

### Mail (mailcow, same VPS)
- `tenant.example` added as its fifth domain
- Mailbox `info@tenant.example`, alias `noreply@` → `info@`
- DKIM key generated, selector `dkim`, 2048-bit
- `mail.tenant.example` appended to `ADDITIONAL_SAN`
- Inert until the MX/SPF/DKIM/DMARC records above are published

### Application
Deployed and verified on the VPS at `/var/www/app`, ten containers,
reachable directly on port 3600 and publicly via Caddy:

- All displayed email addresses moved to `info@tenant.example` /
  `noreply@tenant.example`. `LICENSE_DUBAI.email` deliberately retains
  `consultancy@tenant-invoice.example`, the address printed on the trade licence
- WhatsApp number set to `+1 555 555 0110`
- Phone number removed from the header
- Footer credit added: *Developed and Owned by example.com*, with
  `dir="ltr"` so the mixed Latin/Arabic line does not reorder on Arabic pages

---

## Verified end state

```
delegation      ns5.tasjeel.ae, ns6.tasjeel.ae
authoritative   203.0.113.10 (both NS IPs, serial 2026081432)
certificate     Let's Encrypt production, expires 12 Nov 2026
apex            200  — "M A M INVESTMENT — Investing in people, ideas…"
www             301  → apex
central         307  (auth redirect, expected)
workforce       200
cPanel host     200, no Location header — redirect gone
```

At the time of writing, a sample of twelve public resolvers showed **6 correct,
2 still stale** (Quad9), the rest unreachable from the test host. The stale
ones expire on their own; the 4-hour TTL on the superseded records is the
ceiling.

---

## Mistakes worth recording

Mine, so the next person does not repeat them:

- **I recommended `ns3/ns4`, and that turned out wrong.** It was correct when
  measured — those nameservers held the good records at the time — but the act
  of switching swapped the zones. I should have re-measured after the change
  rather than assuming the mapping was stable.
- **My `fix-dns.sh` had a bug.** Its removal step matched nothing (a Perl
  switch-parsing fault), so instead of replacing records it added a third copy
  of each. Harmless, because every copy carried the same value, but the zone
  should be de-duplicated.
- **I quoted "about an hour" for propagation.** That was the registry's NS TTL
  of 3600. The superseded A records carried 14400, and that is the number that
  actually governed how long stale answers persisted.
- **I misread a failed command as evidence.** `wget` does not exist in the
  Caddy container, so a check for the vhost in the running config returned
  nothing, and I briefly reported the vhost as missing when it was present.

General lessons:

- **Records are invisible unless their nameservers are the delegated ones.**
  Before editing any zone, confirm with
  `dig +short A <domain> @<that-system's-nameserver>` that the system you are
  editing is the one answering.
- **Never change nameservers before the destination zone exists.** That single
  step caused the only true outage of the day.
- **Query the authoritative servers by IP** when resolvers disagree. Public
  resolvers are anycast; two queries from different places hit different caches
  and can legitimately disagree for hours.
- **A 301 is cached by browsers indefinitely.** Once a redirect has been served,
  clearing it from the server is not enough — every browser that saw it keeps
  replaying it until its cache is cleared. Prefer `302` for anything temporary.
- **Lower TTLs to 300 before a migration**, then raise them afterwards. It has
  to be done *in advance*; lowering during the change does nothing for answers
  already cached.

---

## Still outstanding

1. The four mail records above — email does not work without them
2. De-duplicate the A records left by the buggy script
3. Two orphaned `RewriteCond` lines in the cPanel `.htaccess`
4. Decide whether the Tasjeel cPanel hosting is still needed at all
5. Inner-page copy on `/about`, `/services`, `/licence`, `/privacy`, `/terms`
   still reads as the previous company — see [ROADMAP.md](ROADMAP.md)
