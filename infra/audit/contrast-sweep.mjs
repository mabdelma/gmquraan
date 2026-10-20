import { chromium } from "playwright";
import { createHmac } from "crypto";

/**
 * Contrast sweep across every themed surface, in both themes.
 *
 * Two blind spots the first version had, both of which made it report clean
 * pages that were not:
 *
 *   - it skipped any element with child nodes, so a label wrapping a <span>
 *     was never measured;
 *   - it measured collapsed <details> at zero height and moved on.
 *
 * It now walks text nodes and measures the element each one actually lives in,
 * and opens panels first. Gradient-clipped text (transparent colour over a
 * background-clip:text fill) is counted separately rather than reported as a
 * 1.00 failure, which is what it did to the brand wordmark.
 */

const TOK = process.env.ADMIN_TOKEN;
// Computed per context, not passed in. A code minted before the light pass
// has expired by the time the dark pass signs in, and the run then measured
// the sign-in page eight times and called it clean.
const SECRET = process.env.TOTP_SECRET || "";
const totp = () => {
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const s = SECRET.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const ch of s) bits += A.indexOf(ch).toString(2).padStart(5, "0");
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  const ctr = Buffer.alloc(8);
  ctr.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 1000 / 30)));
  const h = createHmac("sha1", Buffer.from(bytes)).update(ctr).digest();
  const o = h[h.length - 1] & 0xf;
  const n = (((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1000000;
  return String(n).padStart(6, "0");
};
const say = (s) => console.log(s);

const CONSOLE_BASE = "https://central.example.com";
const PORTAL_BASE = "https://workforce.example.com";
const ADVISOR = "https://ai.example.com";

const MEASURE = () => {
  const lum = ([r, g, b]) => {
    const f = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const parse = (css) => {
    const m = String(css).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(",").map((n) => parseFloat(n.trim()));
    return { rgb: [p[0], p[1], p[2]], a: p.length > 3 ? p[3] : 1 };
  };
  // Returns the effective background, or null when the nearest painted
  // ancestor uses a gradient. A gradient is background-image, so
  // backgroundColor reads transparent and a naive walk keeps climbing to the
  // page behind it — which is how dark text on the bright brand gradient was
  // reported at 1.02 against the dark page it was never sitting on.
  const bgOf = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const s = getComputedStyle(n);
      if (s.backgroundImage && s.backgroundImage !== "none" && /gradient/.test(s.backgroundImage)) {
        return null;
      }
      const c = parse(s.backgroundColor);
      if (c && c.a > 0.85) return c.rgb;
      n = n.parentElement;
    }
    return parse(getComputedStyle(document.documentElement).backgroundColor)?.rgb || [255, 255, 255];
  };

  const results = { measured: 0, gradient: 0, fails: [] };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = (node.textContent || "").trim();
    if (!text) continue;
    const el = node.parentElement;
    if (!el || seen.has(el)) continue;
    seen.add(el);

    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const s = getComputedStyle(el);
    if (s.visibility === "hidden" || s.display === "none" || parseFloat(s.opacity) < 0.1) continue;

    // Gradient-clipped text: the colour is transparent and the paint comes
    // from a clipped background. Not measurable this way, and not a fault.
    const clip = s.webkitBackgroundClip || s.backgroundClip;
    const fg = parse(s.color);
    if (!fg) continue;
    if (fg.a === 0 || clip === "text") {
      results.gradient++;
      continue;
    }

    const bg = bgOf(el);
    if (!bg) {
      results.gradient++;
      continue;
    }
    const flat = fg.rgb.map((c, i) => c * fg.a + bg[i] * (1 - fg.a));
    const [hi, lo] = [lum(flat), lum(bg)].sort((a, b) => b - a);
    const cr = (hi + 0.05) / (lo + 0.05);

    const size = parseFloat(s.fontSize);
    const bold = parseInt(s.fontWeight, 10) >= 700;
    const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;

    results.measured++;
    if (cr < need) {
      results.fails.push({ text: text.slice(0, 44), cr: cr.toFixed(2), need, size });
    }
  }
  return results;
};

const browser = await chromium.launch();

for (const scheme of ["light", "dark"]) {
  say("");
  say(`══ ${scheme.toUpperCase()} ══`);

  const ctx = await browser.newContext({ colorScheme: scheme, viewport: { width: 1280, height: 1000 } });
  await ctx.addCookies([{
    name: "app_admin", value: TOK, domain: "central.example.com",
    path: "/", httpOnly: true, secure: true, sameSite: "Lax",
  }]);
  const page = await ctx.newPage();

  // Sign in to the portal once per context.
  await page.goto(`${CONSOLE_BASE}/api/central/portal-handoff`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  if (page.url().includes("/mfa") && !page.url().includes("enrol")) {
    await page.locator('input[name="token"], input[autocomplete="one-time-code"]').first().fill(totp());
    await page.locator("form button").first().click();
    await page.waitForTimeout(2500);
  }

  if (!page.url().includes("/home")) {
    say(`  ABORTED: sign-in did not complete (stuck at ${page.url()}). Results would be the sign-in page, not the portal.`);
    await ctx.close();
    continue;
  }

  const PAGES = [
    ["console", `${CONSOLE_BASE}/central`],
    ["console", `${CONSOLE_BASE}/central/workforce`],
    ["console", `${CONSOLE_BASE}/central/branches`],
    ["console", `${CONSOLE_BASE}/central/site-content`],
    ["console", `${CONSOLE_BASE}/central/users`],
    ["portal", `${PORTAL_BASE}/home`],
    ["portal", `${PORTAL_BASE}/repository`],
    ["portal", `${PORTAL_BASE}/repository?path=00_SYSTEM`],
    ["portal", `${PORTAL_BASE}/documents`],
    ["portal", `${PORTAL_BASE}/team`],
    ["portal", `${PORTAL_BASE}/org`],
    ["portal", `${PORTAL_BASE}/leave`],
    ["portal", `${PORTAL_BASE}/me`],
    ["advisor", ADVISOR],
    ["site", "https://example.com/"],
    ["site", "https://example.com/marketplace"],
  ];

  let totalMeasured = 0, totalFails = 0, totalGradient = 0;
  for (const [group, url] of PAGES) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(900);
      await page.evaluate(() => document.querySelectorAll("details").forEach((d) => d.setAttribute("open", "")));
      await page.waitForTimeout(400);
      const r = await page.evaluate(MEASURE);
      totalMeasured += r.measured;
      totalFails += r.fails.length;
      totalGradient += r.gradient;
      const label = url.replace(CONSOLE_BASE, "").replace(PORTAL_BASE, "").replace(ADVISOR, "/") || "/";
      const mark = r.fails.length === 0 ? "ok " : "FAIL";
      say(`  ${mark} ${group.padEnd(7)} ${label.padEnd(32)} ${String(r.measured).padStart(4)} measured  ${r.fails.length} below AA`);
      for (const f of r.fails.slice(0, 4)) {
        say(`        ${f.cr.padStart(5)} (need ${f.need}, ${f.size}px)  "${f.text}"`);
      }
    } catch (e) {
      say(`  ERR  ${group.padEnd(7)} ${url}  ${String(e.message).slice(0, 60)}`);
    }
  }
  say(`  ── ${totalMeasured} elements measured, ${totalFails} below AA, ${totalGradient} gradient-clipped (not measurable)`);
  await ctx.close();
}

await browser.close();
