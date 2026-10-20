// Mobile pass on the portal. I did this work for the public site and never
// verified it here, so this checks the pages an unauthenticated visitor can
// reach at a realistic small-phone width.
import { chromium } from "playwright";

const OUT = process.argv[2] || ".";
const browser = await chromium.launch({
  args: ["--host-resolver-rules=MAP workforce.example.com 203.0.113.10"],
});

const PAGES = ["/", "/mfa", "/mfa/enrol"];
let fail = 0;

for (const scheme of ["light", "dark"]) {
  const ctx = await browser.newContext({
    viewport: { width: 360, height: 740 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    colorScheme: scheme,
  });

  for (const path of PAGES) {
    const page = await ctx.newPage();
    const res = await page.goto(`https://workforce.example.com${path}`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(600);

    const report = await page.evaluate(() => {
      const doc = document.documentElement;
      // Horizontal overflow is the classic small-screen failure.
      const overflow = doc.scrollWidth - doc.clientWidth;

      // Tap targets: WCAG 2.5.8 asks for 24px; 44 is the comfortable minimum.
      const small = [];
      for (const el of document.querySelectorAll("a, button, input, select, textarea")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        if (r.height < 24 || r.width < 24) {
          small.push(`${el.tagName.toLowerCase()}:${Math.round(r.width)}x${Math.round(r.height)}`);
        }
      }

      // Text smaller than 12px is unreadable on a phone.
      const tiny = [];
      for (const el of document.querySelectorAll("p, span, label, li, div")) {
        if (!el.textContent?.trim()) continue;
        const size = parseFloat(getComputedStyle(el).fontSize);
        if (size && size < 12) tiny.push(`${size}px`);
      }

      const styles = getComputedStyle(doc);
      return {
        overflow,
        small: small.slice(0, 5),
        smallCount: small.length,
        tinyCount: tiny.length,
        bg: styles.getPropertyValue("--bg").trim(),
        logoVisible: Boolean(document.querySelector(".brand-logo-light, .brand-logo-dark")),
      };
    });

    const problems = [];
    if (report.overflow > 0) problems.push(`scrolls sideways by ${report.overflow}px`);
    if (report.smallCount > 0) problems.push(`${report.smallCount} tap target(s) under 24px: ${report.small.join(", ")}`);
    if (report.tinyCount > 0) problems.push(`${report.tinyCount} element(s) under 12px text`);
    if (!report.logoVisible) problems.push("no brand mark present");

    const ok = problems.length === 0;
    if (!ok) fail++;
    console.log(
      `${ok ? "PASS" : "FAIL"}  ${scheme.padEnd(5)} ${path.padEnd(12)} HTTP ${res?.status()} bg=${report.bg}` +
        (problems.length ? `\n        ${problems.join("\n        ")}` : "")
    );

    if (path === "/") await page.screenshot({ path: `${OUT}/portal-${scheme}.png` });
    await page.close();
  }
  await ctx.close();
}

await browser.close();
console.log(fail ? `\n${fail} check(s) failed` : "\nmobile pass clean");
