import { prisma } from "../src/index.js";

/**
 * GM-SVOS and the SMC Kit — two portfolio products the team flagged but whose
 * specs aren't defined yet. Seeded as UNPUBLISHED draft shells so they exist in
 * the central console for an admin to complete (title/summary/description/
 * category/price) and publish. They are NOT public until then.
 *
 * Idempotent and non-destructive: upsert by slug with `update: {}`, so re-running
 * never clobbers an admin's later edits.
 *
 * Run:  npm --workspace @app/db exec tsx prisma/seed-draft-products.ts
 */
const DRAFTS = [
  {
    slug: "gm-svos",
    title: "GM-SVOS",
    summary: "Draft — product details pending.",
    description:
      "Draft placeholder for GM-SVOS. Edit this in the central console (title, summary, description, category, price), then publish when ready.",
    category: "SAAS_PLATFORM" as const,
  },
  {
    slug: "smc-kit",
    title: "SMC Kit",
    summary: "Draft — product details pending.",
    description:
      "Draft placeholder for the SMC Kit. Edit this in the central console (title, summary, description, category, price), then publish when ready.",
    category: "LAUNCH_KIT" as const,
  },
];

async function main() {
  for (const d of DRAFTS) {
    await prisma.solution.upsert({
      where: { slug: d.slug },
      update: {}, // never overwrite an admin's later edits
      create: {
        ...d,
        price: 0, // "contact for pricing" until set
        currency: "EUR",
        region: "GLOBAL",
        vendorName: "Unskinned",
        published: false, // stays out of the marketplace until an admin publishes
      },
    });
    console.log("draft ready (unpublished):", d.slug);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
