/**
 * Screenshot a page at real device sizes.
 *
 * Exists because the advisor's mobile layout was being changed blind — reasoning
 * from markup missed that the hero pushed the answer below the fold. Run this
 * before claiming a layout works.
 *
 *   node scripts/shoot.mjs <url> <outDir> [--tool]
 *
 * --tool fakes an active tool result so the compact/answer layout can be seen,
 * which otherwise only appears mid-conversation.
 */
import { mkdirSync } from "node:fs";
import { chromium, devices } from "playwright";

const url = process.argv[2] || "https://ai.example.com/";
const outDir = process.argv[3] || "shots";
const withTool = process.argv.includes("--tool");
mkdirSync(outDir, { recursive: true });

// Small, common, and large — the range that actually breaks.
const TARGETS = [
  { name: "iphone-se", width: 375, height: 667, dpr: 2, mobile: true },
  { name: "iphone-14-pro", width: 393, height: 852, dpr: 3, mobile: true },
  { name: "galaxy-s8", width: 360, height: 740, dpr: 3, mobile: true },
  { name: "ipad-mini", width: 768, height: 1024, dpr: 2, mobile: true },
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

  if (withTool) {
    // Drive the store the way a tool call would, so the answer layout renders.
    await page.evaluate(() => {
      const w = window;
      if (w.__toolStore?.set) {
        w.__toolStore.set("solutionList", {
          query: "AI automation",
          matches: [
            { slug: "a", title: "White-Label SaaS Platform", price: 249000, currency: "EUR", category: "SAAS_PLATFORM", region: "GCC" },
            { slug: "b", title: "Digital Business Launch Kit", price: 129000, currency: "EUR", category: "LAUNCH_KIT", region: "EU" },
            { slug: "c", title: "AI Support Assistant", price: null, currency: "EUR", category: "AI_AUTOMATION", region: "GCC" },
          ],
        });
      }
    });
    await page.waitForTimeout(600);
  }

  // Let the orb settle so the canvas is painted.
  await page.waitForTimeout(900);

  const file = `${outDir}/${t.name}${withTool ? "-answer" : ""}.png`;
  await page.screenshot({ path: file, fullPage: true });

  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  console.log(`${t.name.padEnd(14)} ${t.width}x${t.height}  page height ${h}px  h-overflow: ${overflow}`);
  await ctx.close();
}

await browser.close();
console.log(`\nwritten to ${outDir}/`);
