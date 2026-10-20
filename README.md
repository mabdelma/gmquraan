# gmquraan

The website of **جمعية المحافظة على القرآن الكريم — التناغة الشرقية، ساحل سليم**
(the Association for the Preservation of the Holy Qur'an, Sahel Selim, Assiut,
Egypt), rebuilt on the Unskinned platform.

A community association registered as **no. 224 of 1977**, working in six
fields: Qur'an memorisation, orphan sponsorship, a nursery, a workshop,
service projects and lending.

---

## What this replaces

The association's live site at [gmquran.com](https://gmquran.com/) runs
WordPress with the commercial *Tecnologia* IT-consultancy theme — and the demo
content was never removed. Of 109 public URLs, **three** carry the
association's own words; the other 106 are the theme's fictional IT company:
team members, "industries", case studies, and 23 English blog posts about cloud
migration and cybersecurity. The browser tab still reads "Tecnologia" and the
footer still sells IT services.

This repository is the rebuild. See [docs/SCRAPE.md](docs/SCRAPE.md) for the
full survey of the old site, including two security findings worth acting on.

## Branding

Everything visual derives from the association's own emblem — the teal wreath,
the gold hands, the open book, the registration ribbon.

| Token | Value | Role |
|---|---|---|
| ink teal | `#0C3433` | body text, dark grounds |
| deep teal | `#175F5E` | accent — 7.41:1 on white, so it carries text |
| teal | `#4DACAC` | accent on dark grounds |
| mint | `#B9DECF` | accent text on dark |
| gold | `#D7B75A` | surface only — 1.94:1 on white, never a word |
| paper | `#F8F7F3` | light panel |

**The live site's blue (`#010ED0`) is deliberately not carried over.** It came
with the stock theme, was never the association's colour, and clashed with the
association's own teal-and-gold logo.

Every pairing above is WCAG-checked, and the reasoning is written into
[`globals.css`](apps/web/src/app/globals.css) rather than left implicit. One
inherited constraint is gone: the template's accent was a metallic gold that
could not legally carry text, so it needed a separate deepened variant. The
deep teal clears AA on both light grounds, so `--accent` and `--accent-text`
are now one colour.

### Assets

Both logo variants come from the association itself — it published the emblem
on cream and on black, so each theme gets artwork drawn for it rather than one
file recoloured.

```bash
python scripts/build-brand-assets.py   # logos + full icon set, backgrounds knocked out
python scripts/build-service-tiles.py  # the six service tiles
```

## Two deliberate omissions

Both exist to avoid publishing a claim nobody actually made.

**No named officers.** The live contact page lists eight personal names in bare
`<div>`s, under no heading, with no role against any of them. They are probably
the board — but "probably" is an inference about real private individuals, so
`LEADERSHIP` carries the association's own contact identity instead of handing
those people invented titles. Replace it once the association confirms who
holds which office.

**No photographs of the work.** The media library contains no documentary
photography of the association — only generic stock cards and a stock
illustration. Captioning one of those "our nursery" would present an image as
evidence of something it does not show, so the six service tiles are openly
abstract geometry in the brand palette. Drop real photographs into
`apps/web/public/img/services/` under the same names and the cards pick them up
with no code change.

The same rule governs identifiers: registration no. 224 of 1977 is published
because the association letters it onto its own emblem. The tax number, licence
number and any professional-body registration stay `null`, and the pages render
an explicit "not published" state rather than a plausible-looking number.

## Rebranding surface

Two files and a set of images. Nothing else needs touching.

| File | Carries |
|---|---|
| [`apps/web/src/lib/content.ts`](apps/web/src/lib/content.ts) | identity, registration, office, phones, services |
| [`apps/web/src/lib/brand-content.ts`](apps/web/src/lib/brand-content.ts) | headline copy, values, service areas, page metadata |
| [`apps/web/src/lib/messages.ts`](apps/web/src/lib/messages.ts) | per-locale dictionary, index-aligned with the above |
| [`apps/web/src/app/globals.css`](apps/web/src/app/globals.css) | theme tokens |

All copy exists in five locales (ar, en, es, pt, fr), with **Arabic as the
default** — it is the language the association actually works in. Every locale
field is required, so a half-translated string is a build error rather than an
English sentence shown to a French reader.

## Development

```bash
npm install
npx prisma generate --schema packages/db/prisma/schema.prisma

npm run dev:web     # http://localhost:3000
npm run test:web    # 136 tests
npm run build:web
```

The marketing pages render without any service or database running.

The platform underneath (Fastify microservices, Prisma/Postgres, the realtime
AI advisor, the workforce portal, Caddy/Docker deployment) is documented in
[ARCHITECTURE.md](ARCHITECTURE.md) and [DEPLOY.md](DEPLOY.md). Much of it — the
billing, reseller and workforce subsystems in particular — is far more than a
six-field community association needs; it is inherited from the template and
left intact rather than torn out.

## Tests

136 passing across 12 files. The guard tests inherited from the template were
re-pointed at the association's facts rather than relaxed — they still pin
which identifiers may appear, that every phone number is stored in
international form, that the WhatsApp line is the mobile (the two landlines
cannot carry it), and that no string ships in fewer than five locales.
