import { prisma } from "../src/index.js";

/** Seeds a handful of marketplace solutions + a demo admin so the app has content. */
async function main() {
  const solutions = [
    {
      slug: "launchpad-saas-starter",
      title: "LaunchPad — White-Label SaaS Starter",
      summary: "Rebrandable multi-tenant SaaS boilerplate with billing and auth built in.",
      description:
        "A production-ready, white-label SaaS platform you can rebrand and deploy in days — multi-tenant auth, Stripe billing, admin console and a localized marketing site. Ideal for agencies launching their own SaaS in the GCC or Europe.",
      price: 0,
      category: "SAAS_PLATFORM" as const,
      licenseModel: "SUBSCRIPTION" as const,
      region: "GLOBAL" as const,
      vendorName: "Unskinned Partner Network",
      whiteLabel: true,
      tags: ["saas", "multi-tenant", "billing", "white-label"],
      techStack: ["Next.js", "PostgreSQL", "Stripe"],
      featured: true,
    },
    {
      slug: "storefront-launch-kit",
      title: "Storefront — E-commerce Launch Kit",
      summary: "Everything to launch an online store: site, payments, catalog, branding.",
      description:
        "A complete digital business launch kit: a storefront website, product catalog, checkout, booking and a branding pack — pre-configured and localized for GCC & European markets.",
      price: 149900,
      category: "LAUNCH_KIT" as const,
      licenseModel: "ONE_TIME" as const,
      region: "GCC" as const,
      vendorName: "Unskinned Partner Network",
      whiteLabel: true,
      tags: ["ecommerce", "storefront", "launch-kit"],
      techStack: ["Next.js", "Stripe", "Sanity"],
      featured: true,
    },
    {
      slug: "ai-support-copilot",
      title: "AI Support Copilot",
      summary: "Drop-in AI assistant for customer support and lead qualification.",
      description:
        "An AI & automation solution: a realtime AI assistant that answers customer questions, qualifies leads and automates support workflows — multilingual (English, Arabic, Spanish) out of the box.",
      price: 4900,
      category: "AI_AUTOMATION" as const,
      licenseModel: "SUBSCRIPTION" as const,
      region: "GLOBAL" as const,
      vendorName: "Unskinned AI Labs",
      whiteLabel: false,
      tags: ["ai", "automation", "support", "multilingual"],
      techStack: ["OpenAI Realtime", "Node.js"],
      featured: false,
    },
    {
      slug: "gcc-market-entry",
      title: "GCC Market Entry Package",
      summary: "Localization, distribution and managed deployment into GCC markets.",
      description:
        "A market-enablement service: we localize your product (language, payments, compliance), distribute it through our partner ecosystem, and manage the deployment so you launch in the GCC with reduced risk.",
      price: 0,
      category: "MARKET_ENABLEMENT" as const,
      licenseModel: "REVENUE_SHARE" as const,
      region: "GCC" as const,
      vendorName: "Unskinned",
      whiteLabel: false,
      tags: ["market-entry", "localization", "distribution"],
      techStack: [],
      featured: false,
    },
  ];

  for (const s of solutions) {
    await prisma.solution.upsert({
      where: { slug: s.slug },
      update: s,
      create: s,
    });
  }

  console.log(`Seeded ${solutions.length} solutions.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
