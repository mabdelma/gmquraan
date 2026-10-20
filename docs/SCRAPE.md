# Survey of the live gmquran.com

Archive and analysis of <https://gmquran.com/>, captured 2026-10-19 by
[`scrape_gmquran.py`](../scrape_gmquran.py). This is the reference the rebuild
was built from.

## Running it

```bash
python scrape_gmquran.py              # content only (~2 min)
python scrape_gmquran.py --media      # also mirror the 520 media files (~47 MB)
python scrape_gmquran.py --media-only # re-fetch missing media without re-crawling
```

Needs `requests`, `beautifulsoup4`, `lxml`, `Pillow`. Rate-limited to ~2.5
req/s and obeys `robots.txt` — the only `Disallow` is `/wp-admin/`, which is
never touched. Downloads are resumable and write through a `.part` file, so an
interrupted run leaves no truncated or zero-byte files.

## What the live site is

WordPress 6.7.10 running the commercial **Tecnologia** IT-consultancy theme
(Vamtam + Elementor). The association filled in three pages and left the
theme's demo content published.

| | |
|---|---|
| Real association pages | `/`, `/about/`, `/contact/` — Arabic, RTL |
| Leftover demo URLs | 106 — `/team/*`, `/solutions/*`, `/industries/*`, `/events/*`, categories, tags |
| Posts | 23, **all** English Tecnologia demo articles (Mar–Apr 2023) |
| Pages | 65, **none** with an Arabic title |

The genuine content is roughly 4 KB of Arabic prose. The site title renders as
"Tecnologia" and the footer advertises IT services.

### What was captured as real

- **Six fields of work:** تحفيظ قرآن، كفالة يتيم، حضانة، مشغل، مشروعات خدمية، إقراض
- **Objectives and values:** transparency without favour, disease-risk
  awareness, local community development, maternal and child welfare,
  consultation and shared responsibility, human dignity, cooperation — with
  women's participation named explicitly
- **Registration:** مشهرة برقم ٢٢٤ لسنة ١٩٧٧, lettered onto the emblem
- **Address:** خلف قسم ثانٍ، ش/ فهمى عمارة خالد إسماعيل رقم ١٧، المقر الرئيسي، ساحل سليم، التناغة الشرقية
- **Phones:** 01020048168 (labelled as the board chairman's line), 0882138958, 0882941100
- **Email:** info@gmquran.com — the only mailbox published

### Imagery

The media library holds 520 files, and almost none of it is the association's.
The "logo" files are third-party artwork shipped with the theme demo —
Elementor, Microsoft, AWS, Google, Clutch, Sodexo, WooCommerce. The Jan 2025
uploads are a mix of Unsplash stock and generic green social cards carrying
single Arabic words. There is **no documentary photography of the
association's own work**.

What is genuine: the emblem, uploaded twice — once on a cream ground and once
on black. Those two files are the entire basis of the rebuild's visual
identity.

## Security observations

Neither of these was sought out; both fell out of reading the media library and
the REST API.

### 1. Four PHP-named uploads (2026-03-18)

| | |
|---|---|
| Attachment IDs | 987865–987868 |
| Title (all four) | `o9ckynfk.php` |
| Served paths | `/wp-content/uploads/2026/03/o9ckynfk.php_.gif`, `…php_-1.gif`, `…php_-2.gif`, `…php00.gif` |
| Registered MIME | `image/gif` |
| Size in DB | 175 bytes each |
| Size actually served | **0 bytes** (HTTP 200) |

Why this reads as an intrusion attempt: a randomised stem with a `.php`
extension is not a hand upload, and ~175 bytes is about a GIF magic header
glued to a short PHP payload — the usual trick for getting past an image-only
upload filter. All four arrived the same day, and **2026-03 contains nothing
else**; every other upload is the Mar–Apr 2023 theme bulk or the Dec 2024 /
Jan 2025 batch. Nothing on the site links to them.

What limits it, stated precisely: WordPress's filename sanitiser appended
`.gif` to the `.php` name, so these were **never reachable as executable PHP**
at those paths, and all four now serve 0 bytes — the payload appears to have
been emptied, leaving orphaned database rows.

So: a **neutralised attempt, not a live webshell**. It still means a write
reached the media library, which needs either a logged-in account or an upload
vulnerability. Worth doing — confirm the four rows are unexplained and delete
them, update WordPress and the Vamtam/Elementor stack, rotate the `gmquran`
account password, and scan `wp-content/uploads/` for other `.php*` files.

### 2. The REST API is readable unauthenticated

`wp-json/wp/v2/*` served pages, posts, the full 520-item media library and the
user list without credentials — which is how this survey got everything so
easily. That is stock WordPress behaviour rather than a misconfiguration, but
it does publish the sole author account (`gmquran`) and every uploaded file,
including ones no page links to.

### 3. Eight personal names, no roles

The contact page lists eight people in bare `<div>`s with no heading and no
role against any of them. They are not carried into the rebuild — see the
README's "Two deliberate omissions". Worth confirming with the association
whether they intended to publish these names at all.

## Output layout (`scrape_out/`)

| Path | Contents |
|---|---|
| `SITE_CONTENT.md` | every page's extracted text in one file |
| `pages_parsed.json` | per page: title, meta, headings, links, images, text |
| `pages.csv` | one row per URL with element counts |
| `pages_text/*.md` | one markdown file per page (109) |
| `raw_html/*.html` | unmodified HTML as served (109 files, ~15 MB) |
| `api/*.json` | raw WP REST dumps |
| `media_index.json`, `media.csv` | all 520 attachments |
| `media/` | mirrored files under their `wp-content/uploads/` paths |
| `links.json` | 3,586 link edges |
| `urls.json`, `manifest.json` | crawl inventory and run metadata |

`raw_html/` and `media/` are gitignored — 55 MB of WordPress markup and
overwhelmingly third-party stock imagery. The structured extracts are kept as
design reference, and the association's own images live in
`apps/web/public/img/assoc/` where the app reads them.

## Notes

- Media counts drift slightly between runs: a bare header probe reported 529
  items, paged reads return 520.
- `/sitemap_index.xml` does not exist (no Yoast); the real index is
  `/wp-sitemap.xml`.
- Content belongs to the association. This is a local archive and a rebuild
  input, not material to republish elsewhere.
