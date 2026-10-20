#!/usr/bin/env python3
"""
Scraper for https://gmquran.com/ -- a WordPress site (Arabic, RTL) for
جمعية المحافظة على القرآن الكريم - ساحل سليم.

Strategy:
  1. Pull structured content from the open WP REST API (pages, posts,
     media, categories, tags, users, menus).
  2. Pull every URL in wp-sitemap.xml as raw HTML.
  3. Extract clean text from each rendered page.
  4. Emit JSON + Markdown + CSV outputs.

Respects robots.txt (only /wp-admin/ is disallowed; we never touch it)
and rate-limits itself.

Usage:
  python scrape_gmquran.py              # content only
  python scrape_gmquran.py --media      # content, then download all media files
  python scrape_gmquran.py --media-only # download media using the existing
                                        # media_index.json (skips the crawl)
"""
import csv
import html
import json
import re
import sys
import time
import urllib.parse as up
from pathlib import Path

import requests
from bs4 import BeautifulSoup

BASE = "https://gmquran.com"
OUT = Path(__file__).parent / "scrape_out"
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
DELAY = 0.4          # seconds between requests
TIMEOUT = 45

BAD_FS_CHARS = re.compile(r'[<>:"\\|?*\x00-\x1f]')

session = requests.Session()
session.headers.update({"User-Agent": UA, "Accept-Language": "ar,en;q=0.8"})

# Arabic filenames and titles get logged. When stdout is a pipe or a file on
# Windows it defaults to cp1252, which cannot encode them -- that raises
# UnicodeEncodeError mid-run. Force UTF-8 and never let logging kill a scrape.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass


def log(*a):
    try:
        print(*a, flush=True)
    except (UnicodeEncodeError, OSError):
        safe = [str(x).encode("ascii", "replace").decode("ascii") for x in a]
        print(*safe, flush=True)


def get(url, **kw):
    """GET with retries. Returns the response or None."""
    for attempt in range(3):
        try:
            r = session.get(url, timeout=TIMEOUT, **kw)
            time.sleep(DELAY)
            if r.status_code == 200:
                return r
            log("  ! %s %s" % (r.status_code, url))
            if r.status_code in (401, 403, 404):
                return None
        except requests.RequestException as e:
            log("  ! %s %s" % (type(e).__name__, url))
        time.sleep(1.5 * (attempt + 1))
    return None


def write_json(name, data):
    p = OUT / name
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    log("  -> %s" % p.relative_to(OUT.parent))


# ---------------------------------------------------------------- REST API

def rest_all(endpoint, per_page=100, extra=None):
    """Page through a WP REST collection, returning every item."""
    items, page = [], 1
    while True:
        params = {"per_page": per_page, "page": page}
        if extra:
            params.update(extra)
        r = get(BASE + "/wp-json/wp/v2/" + endpoint, params=params)
        if r is None:
            break
        try:
            batch = r.json()
        except ValueError:
            break
        if not isinstance(batch, list) or not batch:
            break
        items.extend(batch)
        total_pages = int(r.headers.get("x-wp-totalpages", 1) or 1)
        log("  %s: page %d/%d (+%d)" % (endpoint, page, total_pages, len(batch)))
        if page >= total_pages:
            break
        page += 1
    return items


# ------------------------------------------------------------- HTML -> text

STRIP_TAGS = ["script", "style", "noscript", "svg", "iframe", "link", "meta"]
BLOCK_TAGS = ["p", "div", "li", "h1", "h2", "h3", "h4", "h5", "h6", "tr", "section"]


def clean_text(fragment_html):
    """Collapse an HTML fragment down to readable plain text."""
    if not fragment_html:
        return ""
    soup = BeautifulSoup(fragment_html, "html.parser")
    for t in soup(STRIP_TAGS):
        t.decompose()
    for br in soup.find_all("br"):
        br.replace_with("\n")
    for blk in soup.find_all(BLOCK_TAGS):
        blk.append("\n")
    text = html.unescape(soup.get_text(" "))
    text = text.replace("\u00a0", " ").replace("\u200b", "")
    text = re.sub(r"[ \t\u2000-\u200a]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def slugify(url):
    """Turn a page URL into a safe filename stem."""
    path = up.urlsplit(url).path.strip("/")
    if not path:
        return "index"
    stem = BAD_FS_CHARS.sub("_", up.unquote(path).replace("/", "__"))
    return stem[:120] or "index"


def parse_page(url, raw):
    """Pull the interesting bits out of a rendered WordPress page."""
    soup = BeautifulSoup(raw, "html.parser")

    def meta(attr, val):
        tag = soup.find("meta", attrs={attr: val})
        return (tag.get("content") or "").strip() if tag else ""

    info = {
        "url": url,
        "title": soup.title.get_text(strip=True) if soup.title else "",
        "meta_description": meta("name", "description") or meta("property", "og:description"),
        "og_title": meta("property", "og:title"),
        "og_image": meta("property", "og:image"),
        "lang": (soup.html.get("lang") if soup.html else "") or "",
        "dir": (soup.html.get("dir") if soup.html else "") or "",
    }

    for t in soup(STRIP_TAGS):
        t.decompose()

    # The main content container, falling back progressively.
    main = (soup.find("main")
            or soup.find("article")
            or soup.find(attrs={"id": "content"})
            or soup.find(attrs={"class": re.compile(r"\bentry-content\b")})
            or soup.body
            or soup)

    info["headings"] = [
        {"level": int(h.name[1]), "text": h.get_text(" ", strip=True)}
        for h in main.find_all(["h1", "h2", "h3", "h4", "h5", "h6"])
        if h.get_text(strip=True)
    ]

    links, seen = [], set()
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if href.startswith(("mailto:", "tel:", "javascript:", "#")):
            kind = href.split(":", 1)[0] if ":" in href else "anchor"
        else:
            href = up.urljoin(url, href)
            host = up.urlsplit(href).netloc
            kind = "internal" if host.endswith("gmquran.com") else "external"
        key = (href, kind)
        if key in seen:
            continue
        seen.add(key)
        links.append({"href": href, "text": a.get_text(" ", strip=True), "kind": kind})
    info["links"] = links

    images = []
    for img in soup.find_all("img"):
        src = (img.get("src") or img.get("data-src") or "").strip()
        if not src or src.startswith("data:"):
            continue
        images.append({"src": up.urljoin(url, src), "alt": (img.get("alt") or "").strip()})
    info["images"] = images

    info["text"] = clean_text(str(main))
    info["bytes"] = len(raw.encode("utf-8", "ignore"))
    return info


# -------------------------------------------------------------- sitemap

def sitemap_urls():
    """Walk wp-sitemap.xml (and its children) for every public URL."""
    to_visit, urls, seen = [BASE + "/wp-sitemap.xml"], [], set()
    while to_visit:
        sm = to_visit.pop(0)
        if sm in seen:
            continue
        seen.add(sm)
        r = get(sm)
        if r is None:
            continue
        soup = BeautifulSoup(r.text, "xml")
        if soup.find("sitemapindex"):
            for loc in soup.select("sitemap > loc"):
                to_visit.append(loc.get_text(strip=True))
        for loc in soup.select("url > loc"):
            u = loc.get_text(strip=True)
            if u not in urls:
                urls.append(u)
        log("  sitemap %s -> %d urls so far" % (sm, len(urls)))
    return urls


# -------------------------------------------------------------- main

def download_all_media(media_rows):
    """Mirror every attachment under scrape_out/media/.

    Resumable: a file that already exists with non-zero size is skipped, so a
    re-run only fetches what is missing. Each download goes to a .part file and
    is renamed on success, so an interrupted run never leaves a truncated or
    zero-byte file behind.
    """
    mdir = OUT / "media"
    mdir.mkdir(parents=True, exist_ok=True)
    ok = skipped = failed = 0
    for i, m in enumerate(media_rows, 1):
        src = m.get("url")
        if not src:
            continue
        rel = BAD_FS_CHARS.sub("_", up.unquote(up.urlsplit(src).path).lstrip("/"))
        dest = mdir / rel
        if dest.exists() and dest.stat().st_size > 0:
            skipped += 1
            continue
        try:
            dest.parent.mkdir(parents=True, exist_ok=True)
            log(" [%d/%d] %s" % (i, len(media_rows), rel))
            r = get(src, stream=True)
            if r is None:
                failed += 1
                continue
            tmp = dest.with_name(dest.name + ".part")
            with tmp.open("wb") as fh:
                for chunk in r.iter_content(65536):
                    fh.write(chunk)
            tmp.replace(dest)
            ok += 1
        except Exception as e:                      # one bad file must not abort
            log("  ! %s on %s: %s" % (type(e).__name__, rel, e))
            failed += 1
    log("media: %d downloaded, %d already present, %d failed" % (ok, skipped, failed))
    return {"downloaded": ok, "skipped": skipped, "failed": failed}


def main():
    download_media = "--media" in sys.argv
    media_only = "--media-only" in sys.argv

    if media_only:
        index = OUT / "media_index.json"
        if not index.exists():
            log("No %s -- run a full scrape first." % index)
            return
        rows = json.loads(index.read_text(encoding="utf-8"))
        log("Downloading %d media files from existing index" % len(rows))
        download_all_media(rows)
        log("Done.")
        return

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "raw_html").mkdir(exist_ok=True)
    (OUT / "pages_text").mkdir(exist_ok=True)
    (OUT / "api").mkdir(exist_ok=True)

    manifest = {"source": BASE, "scraped_at": time.strftime("%Y-%m-%dT%H:%M:%S%z")}

    # ---- 1. REST API -----------------------------------------------------
    log("\n[1/5] WordPress REST API")
    api = {}
    for ep in ["pages", "posts", "media", "categories", "tags", "users",
               "menu-items", "menus", "comments"]:
        log(" fetching %s" % ep)
        got = rest_all(ep)
        api[ep] = got
        write_json("api/%s.json" % ep, got)
        manifest["count_" + ep.replace("-", "_")] = len(got)

    # ---- 2. Sitemap ------------------------------------------------------
    log("\n[2/5] Sitemap discovery")
    urls = sitemap_urls()
    # Add anything the API knows about that the sitemap missed.
    for coll in ("pages", "posts"):
        for item in api.get(coll, []):
            link = item.get("link")
            if link and link not in urls:
                urls.append(link)
    if BASE + "/" not in urls:
        urls.insert(0, BASE + "/")
    write_json("urls.json", urls)
    manifest["count_urls"] = len(urls)
    log(" %d URLs to fetch" % len(urls))

    # ---- 3. Fetch + parse every page ------------------------------------
    log("\n[3/5] Fetching rendered pages")
    parsed = []
    for i, u in enumerate(urls, 1):
        log(" [%d/%d] %s" % (i, len(urls), u))
        r = get(u)
        if r is None:
            parsed.append({"url": u, "error": "fetch failed"})
            continue
        r.encoding = r.encoding or "utf-8"
        stem = slugify(u)
        (OUT / "raw_html" / (stem + ".html")).write_text(r.text, encoding="utf-8")
        rec = parse_page(u, r.text)
        rec["file"] = "raw_html/" + stem + ".html"
        parsed.append(rec)
        body = "# %s\n\nURL: %s\nDescription: %s\n\n---\n\n%s\n" % (
            rec["title"], u, rec["meta_description"], rec["text"])
        (OUT / "pages_text" / (stem + ".md")).write_text(body, encoding="utf-8")

    write_json("pages_parsed.json", parsed)

    # ---- 4. Flat reports -------------------------------------------------
    log("\n[4/5] Writing reports")
    with (OUT / "pages.csv").open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["url", "title", "meta_description", "n_headings",
                    "n_links", "n_images", "text_chars"])
        for p in parsed:
            if p.get("error"):
                w.writerow([p["url"], "ERROR: " + p["error"], "", 0, 0, 0, 0])
                continue
            w.writerow([p["url"], p["title"], p["meta_description"],
                        len(p["headings"]), len(p["links"]),
                        len(p["images"]), len(p["text"])])

    media_rows = []
    for m in api.get("media", []):
        details = m.get("media_details") or {}
        media_rows.append({
            "id": m.get("id"),
            "title": (m.get("title") or {}).get("rendered", ""),
            "url": m.get("source_url", ""),
            "mime": m.get("mime_type", ""),
            "date": m.get("date", ""),
            "alt": m.get("alt_text", ""),
            "width": details.get("width"),
            "height": details.get("height"),
            "filesize": details.get("filesize"),
        })
    write_json("media_index.json", media_rows)
    with (OUT / "media.csv").open("w", newline="", encoding="utf-8-sig") as f:
        cols = list(media_rows[0].keys()) if media_rows else ["id", "url"]
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        w.writerows(media_rows)

    # Content digest: one markdown file with every page's text.
    with (OUT / "SITE_CONTENT.md").open("w", encoding="utf-8") as f:
        f.write("# gmquran.com - scraped content\n\nSource: %s  \nScraped: %s  \n"
                "Pages: %d\n" % (BASE, manifest["scraped_at"], len(parsed)))
        for p in parsed:
            if p.get("error"):
                continue
            f.write("\n\n---\n\n## %s\n\n`%s`\n\n" % (p["title"] or p["url"], p["url"]))
            if p["meta_description"]:
                f.write("> %s\n\n" % p["meta_description"])
            f.write(p["text"][:20000] + "\n")

    # Link graph across the whole site.
    edges = []
    for p in parsed:
        for l in p.get("links", []):
            edges.append({"from": p["url"], "to": l["href"],
                          "kind": l["kind"], "text": l["text"]})
    write_json("links.json", edges)
    manifest["count_links"] = len(edges)

    # ---- 5. Optional media download -------------------------------------
    if download_media:
        log("\n[5/5] Downloading media files")
        download_all_media(media_rows)
    else:
        log("\n[5/5] Skipping media download (pass --media to enable)")

    write_json("manifest.json", manifest)
    log("\nDone. Summary:")
    for k, v in manifest.items():
        log("  %s: %s" % (k, v))


if __name__ == "__main__":
    main()
