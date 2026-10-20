/**
 * Export print-ready business cards from the shared SVG renderer.
 *
 * Reads scripts/card-roster.json, renders each person's chosen country/language
 * layouts, and writes a vector SVG plus a 300dpi PNG per side.
 *
 *   node scripts/export-cards.mjs                     # -> ~/Desktop/APP_Cards
 *   node scripts/export-cards.mjs --out ./out         # custom directory
 *   node scripts/export-cards.mjs --dpi 600           # higher-resolution raster
 *   node scripts/export-cards.mjs --proof             # one sheet per layout, no roster
 *
 * Output is 91×61mm — an 85×55mm card plus 3mm bleed — with crop marks.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const ts = require("typescript");

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

// The renderer is TypeScript and shared with the Next app; transpile it in memory
// rather than duplicating the artwork here.
const srcPath = join(ROOT, "apps/web/src/lib/business-card.ts");
const js = ts.transpileModule(readFileSync(srcPath, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const card = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};
const has = (name) => argv.includes(`--${name}`);

const outDir = flag("out", join(homedir(), "Desktop", "APP_Cards"));
const dpi = Number(flag("dpi", "300"));
mkdirSync(outDir, { recursive: true });

// librsvg and sharp both apply a dpi scale, so `density` alone over-renders by
// ~4x. Resize to the pixel size the physical card actually needs, and stamp the
// density into the PNG so print software reads the right physical size.
const pxFor = (mm) => Math.round((mm / 25.4) * dpi);
const targetW = pxFor(card.CARD_MM.w);
const targetH = pxFor(card.CARD_MM.h);

async function write(basename, svg) {
  writeFileSync(join(outDir, `${basename}.svg`), svg);
  await sharp(Buffer.from(svg), { density: dpi })
    .resize(targetW, targetH, { fit: "fill" })
    .withMetadata({ density: dpi })
    .png()
    .toFile(join(outDir, `${basename}.png`));
  console.log(`  ${basename}.svg + .png`);
}

if (has("proof")) {
  // One front and one back per approved layout, with placeholder content.
  const sample = {
    name: "Firstname Lastname",
    title: "Job Title",
    phone: "+000 00 000 0000",
    email: "name@example.com",
    location: "City, Country",
  };
  const arabic = {
    name: "الاسم الكامل",
    title: "المسمى الوظيفي",
    phone: "+971 00 000 0000",
    email: "name@example.com",
    location: "المدينة، البلد",
  };
  for (const v of card.CARD_VARIANTS) {
    const p = v.lang === "ar" ? arabic : sample;
    console.log(`proof ${v.country}/${v.lang}`);
    await write(`PROOF_${v.country}_${v.lang}_front`, card.renderCardFront(p, v));
    await write(`PROOF_${v.country}_${v.lang}_back`, card.renderCardBack(v));
  }
  console.log(`\nProofs written to ${outDir}`);
  process.exit(0);
}

const roster = JSON.parse(readFileSync(join(HERE, "card-roster.json"), "utf8"));
const incomplete = [];

for (const person of roster.people) {
  for (const v of person.variants) {
    const phone = person.phones?.[v.country] || "";
    const location = person.locations?.[v.country] || "";
    if (person.incomplete || !phone || !location || person.email.startsWith("TODO")) {
      incomplete.push(`${person.name} (${v.country}/${v.lang}) — missing ${[
        !phone && "phone",
        !location && "location",
        person.email.startsWith("TODO") && "email",
        person.title.startsWith("TODO") && "title",
      ]
        .filter(Boolean)
        .join(", ")}`);
    }
    const p = { name: person.name, title: person.title, phone, email: person.email, location };
    const base = card.cardSlug(person.name, v);
    console.log(`${person.name} — ${v.country}/${v.lang}`);
    await write(`${base}_front`, card.renderCardFront(p, v));
    await write(`${base}_back`, card.renderCardBack(v));
  }
}

console.log(`\nWritten to ${outDir} at ${dpi}dpi.`);
if (incomplete.length) {
  console.log("\n⚠ Incomplete — do NOT send these to print until filled in:");
  for (const line of incomplete) console.log(`  - ${line}`);
}
