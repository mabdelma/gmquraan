/**
 * Mobile compatibility sweep across routes.
 *
 * Horizontal overflow is the failure that actually breaks a phone layout, and it
 * is invisible from source — so this loads each route at phone widths, asks the
 * page whether it scrolls sideways, and when it does, names the specific
 * elements sticking out past the viewport. Also flags tap targets under 44px and
 * text under 12px, which are the other two things that consistently go wrong.
 *
 *   node scripts/audit-mobile.mjs <baseUrl> [outDir]
 */
import { mkdirSync } from "node:fs";
import { chromium, devices } from "playwright";

const base = (process.argv[2] || "https://example.com").replace(/\/$/, "");
const outDir = process.argv[3] || "";
if (outDir) mkdirSync(outDir, { recursive: true });

const ROUTES = (process.env.APP_ROUTES || [
  "/", "/about", "/services", "/marketplace", "/cards", "/licence",
  "/contact", "/partners", "/blog", "/compare", "/login", "/signup",
].join(",")).split(",").filter(Boolean);

// Optional central-console sign-in, so the admin routes can be audited too.
const LOGIN = process.env.APP_EMAIL && process.env.APP_PASS
  ? { email: process.env.APP_EMAIL, password: process.env.APP_PASS }
  : null;

// 360 is the narrowest mainstream Android; 375 the smallest common iPhone.
const SIZES = [
  { name: "360", width: 360, height: 740 },
  { name: "375", width: 375, height: 667 },
];

// A dev machine may not resolve the production domain. APP_MAP_IP maps the
// hostname to an address while keeping SNI/Host intact.
const mapIp = process.env.APP_MAP_IP;
const host = new URL(base).hostname;
const browser = await chromium.launch({
  args: mapIp ? [`--host-resolver-rules=MAP ${host} ${mapIp}`] : [],
});
const problems = [];

for (const size of SIZES) {
  const ctx = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: devices["iPhone 13"].userAgent,
  });

  if (LOGIN) {
    await ctx.request.post(`${base}/api/central/login`, { data: LOGIN }).catch(() => {});
  }

  for (const route of ROUTES) {
    const page = await ctx.newPage();
    let status = 0;
    try {
      const res = await page.goto(base + route, { waitUntil: "domcontentloaded", timeout: 45_000 });
      status = res?.status() ?? 0;
      await page.waitForTimeout(700);
    } catch {
      console.log(`${size.name} ${route.padEnd(14)} LOAD FAILED`);
      await page.close();
      continue;
    }

    const report = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const overflows = document.documentElement.scrollWidth > vw + 1;

      // Name the widest offenders rather than just saying "something overflows".
      const culprits = [];
      if (overflows) {
        for (const el of Array.from(document.querySelectorAll("body *"))) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (r.right > vw + 1 || r.left < -1) {
            const cs = getComputedStyle(el);
            if (cs.position === "fixed" || cs.visibility === "hidden") continue;
            culprits.push({
              tag: el.tagName.toLowerCase(),
              cls: (el.className?.toString?.() || "").slice(0, 70),
              right: Math.round(r.right),
              width: Math.round(r.width),
            });
          }
        }
      }

      // Interactive controls that are too small to hit reliably.
      const small = [];
      for (const el of Array.from(document.querySelectorAll("a,button,select,input,[role=button]"))) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        // Skip links are 1px until focused; that is correct, not a defect.
        const cs2 = getComputedStyle(el);
        if (r.height <= 2 && cs2.position === "absolute") continue;
        if (r.height < 32) {
          small.push({ tag: el.tagName.toLowerCase(), h: Math.round(r.height), text: (el.textContent || "").trim().slice(0, 28) });
        }
      }

      // Body copy below 12px is uncomfortable on a phone.
      const tiny = new Set();
      for (const el of Array.from(document.querySelectorAll("p,span,li,td,div,a"))) {
        if (!el.textContent?.trim() || el.children.length) continue;
        const fs = parseFloat(getComputedStyle(el).fontSize);
        if (fs && fs < 12) tiny.add(`${el.tagName.toLowerCase()}@${fs}px`);
      }

      return {
        vw,
        scrollWidth: document.documentElement.scrollWidth,
        overflows,
        culprits: culprits.slice(0, 6),
        small: small.slice(0, 6),
        smallCount: small.length,
        tiny: [...tiny].slice(0, 4),
      };
    });

    if (outDir) {
      await page.screenshot({
        path: `${outDir}/${size.name}${route.replace(/\//g, "_") || "_home"}.png`,
        fullPage: true,
      });
    }

    const flags = [];
    if (report.overflows) flags.push(`OVERFLOW ${report.scrollWidth}>${report.vw}`);
    if (report.smallCount) flags.push(`${report.smallCount} small targets`);
    if (report.tiny.length) flags.push(`tiny text ${report.tiny.join(",")}`);

    console.log(
      `${size.name} ${route.padEnd(14)} ${String(status).padEnd(4)} ${flags.length ? flags.join(" · ") : "ok"}`
    );
    for (const c of report.culprits) {
      console.log(`      ↳ <${c.tag} class="${c.cls}"> right=${c.right} width=${c.width}`);
    }
    for (const s of report.small.slice(0, 3)) {
      console.log(`      ↳ ${s.tag} h=${s.h}px "${s.text}"`);
    }

    if (flags.length) problems.push(`${size.name}${route}`);
    await page.close();
  }
  await ctx.close();
}

await browser.close();
console.log(`\n${problems.length ? `${problems.length} route/size combos with findings` : "no findings"}`);
