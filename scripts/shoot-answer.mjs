/**
 * Screenshot the advisor's ANSWER state, which only appears mid-conversation.
 *
 * The real state comes from a realtime tool call, so it cannot be reached from a
 * script. Instead this applies the same DOM the app produces — the `is-compact`
 * class plus a result card in the answer column — so the compact/sticky layout
 * can actually be looked at rather than assumed.
 *
 *   node scripts/shoot-answer.mjs <url> <outDir>
 */
import { mkdirSync } from "node:fs";
import { chromium, devices } from "playwright";

const url = process.argv[2] || "http://localhost:3399/";
const outDir = process.argv[3] || "shots-answer";
mkdirSync(outDir, { recursive: true });

const TARGETS = [
  { name: "iphone-se", width: 375, height: 667, dpr: 2, mobile: true },
  { name: "galaxy-s8", width: 360, height: 740, dpr: 3, mobile: true },
  { name: "desktop", width: 1280, height: 900, dpr: 1, mobile: false },
];

const browser = await chromium.launch();

for (const t of TARGETS) {
  const ctx = await browser.newContext({
    viewport: { width: t.width, height: t.height },
    deviceScaleFactor: t.dpr,
    isMobile: t.mobile,
    hasTouch: t.mobile,
    userAgent: t.mobile ? devices["iPhone 13"].userAgent : undefined,
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });

  await page.evaluate(() => {
    const card = document.querySelector(".advisor-card");
    const col = card?.closest(".advisor-col");
    const row = col?.parentElement;
    if (!card || !col || !row) return;

    card.classList.add("is-compact");
    col.className = "col-12 col-lg-4 order-2 order-lg-1 advisor-col";

    const answer = document.createElement("div");
    answer.className = "col-12 col-lg-7 order-1 order-lg-2";
    answer.innerHTML = `
      <div style="background:#101a30;border:1px solid rgba(255,255,255,0.1);border-radius:16px;
                  padding:clamp(14px,4vw,20px);color:#e8eefc;max-width:560px;margin:0 auto;width:100%">
        <h3 style="font-size:18px;font-weight:800;margin-bottom:12px">Matching solutions — “AI automation”</h3>
        ${[
          ["White-Label SaaS Platform", "€2,490", "SaaS platform · GCC"],
          ["Digital Business Launch Kit", "€1,290", "Launch kit · Europe"],
          ["AI Support Assistant", "Contact us", "AI &amp; automation · GCC"],
          ["Marketplace Connector", "€890", "Marketplace · Europe"],
        ]
          .map(
            ([title, price, meta]) => `
          <a style="display:block;text-decoration:none;color:#e8eefc;
                    border-top:1px solid rgba(255,255,255,0.08);padding:10px 0">
            <div style="display:flex;justify-content:space-between;gap:10px">
              <span style="font-weight:600">${title}</span>
              <span style="color:#fbbf24;white-space:nowrap">${price}</span>
            </div>
            <span style="color:#a8b6cf;font-size:12px">${meta}</span>
          </a>`
          )
          .join("")}
      </div>`;
    row.appendChild(answer);
  });

  await page.waitForTimeout(800);
  await page.screenshot({ path: `${outDir}/${t.name}-answer.png`, fullPage: true });

  // The point of the redesign: is the answer visible without scrolling, and does
  // the control stay on screen after scrolling?
  const metrics = await page.evaluate(() => {
    const answer = document.querySelector(".order-1 h3");
    const cta = document.querySelector(".advisor-cta");
    return {
      answerTop: answer ? Math.round(answer.getBoundingClientRect().top) : null,
      ctaTop: cta ? Math.round(cta.getBoundingClientRect().top) : null,
      viewport: window.innerHeight,
      pageHeight: document.documentElement.scrollHeight,
    };
  });
  await page.evaluate(() => window.scrollTo(0, 9999));
  await page.waitForTimeout(400);
  const afterScroll = await page.evaluate(() => {
    const cta = document.querySelector(".advisor-cta");
    if (!cta) return null;
    const r = cta.getBoundingClientRect();
    return { top: Math.round(r.top), onScreen: r.top >= 0 && r.bottom <= window.innerHeight };
  });
  await page.screenshot({ path: `${outDir}/${t.name}-answer-scrolled.png` });

  console.log(
    `${t.name.padEnd(12)} answer at y=${metrics.answerTop} (viewport ${metrics.viewport}) · ` +
      `control on screen after scrolling to bottom: ${afterScroll?.onScreen}`
  );
  await ctx.close();
}

await browser.close();
console.log(`\nwritten to ${outDir}/`);
