import { prisma } from "../src/index.js";

/**
 * First-party Unskinned service packages, productized from the official Example City
 * licensed activities. Listed in the marketplace as "contact for pricing"
 * services (clients request a consultation/demo). Idempotent (upsert by slug).
 */
const LOGO = "/logo.svg"; // Unskinned golden brand mark (served from web /public)

const SERVICES = [
  {
    slug: "software-systems-development",
    code: "6201001",
    title: "Custom Software & Systems Development",
    summary: "Bespoke software, platforms and business systems, designed and built to your requirements.",
    description:
      "End-to-end custom software and systems development — from architecture and UX to delivery and support. We design computer systems and software tailored to your operations, integrations and scale.",
    category: "SAAS_PLATFORM" as const,
    licenseModel: "ONE_TIME" as const,
    tags: ["software", "systems", "development", "custom"],
    featured: true,
  },
  {
    slug: "website-design-development",
    code: "6201005",
    title: "Website Design & Development",
    summary: "High-converting marketing sites and web apps, designed and built end-to-end.",
    description:
      "Network website design and development: fast, responsive, multilingual sites and web applications — from brand and UX through build, SEO and launch.",
    category: "LAUNCH_KIT" as const,
    licenseModel: "ONE_TIME" as const,
    tags: ["website", "web", "design", "development"],
    featured: false,
  },
  {
    slug: "ai-strategy-consulting",
    code: "7020039",
    title: "AI Strategy & Consulting",
    summary: "AI research, feasibility studies and implementation consulting for your business.",
    description:
      "Innovation and artificial-intelligence research and consultancy: identify high-impact AI use cases, run feasibility studies, and implement assistants, automation and intelligent workflows.",
    category: "AI_AUTOMATION" as const,
    licenseModel: "ONE_TIME" as const,
    tags: ["ai", "consulting", "research", "automation"],
    featured: true,
  },
  {
    slug: "embedded-chip-design",
    code: "6201002",
    title: "Embedded & Electronic Chip Design",
    summary: "Electronic chip design and embedded firmware programming for hardware products.",
    description:
      "Electronic chips designing and programming — embedded systems, firmware and hardware-software integration for connected and IoT products.",
    category: "PRODUCTIZED_SERVICE" as const,
    licenseModel: "ONE_TIME" as const,
    tags: ["embedded", "hardware", "firmware", "iot"],
    featured: false,
  },
  {
    slug: "brand-product-design",
    code: "7410003",
    title: "Brand & Product Design",
    summary: "Branding, UI/UX and creative design delivered as a productized service.",
    description:
      "Design services: brand identity, UI/UX, design systems and creative production — repeatable, business-ready design packages.",
    category: "PRODUCTIZED_SERVICE" as const,
    licenseModel: "ONE_TIME" as const,
    tags: ["design", "branding", "ui", "ux"],
    featured: false,
  },
  {
    slug: "ecommerce-store-setup",
    code: "4791018",
    title: "E-Commerce Store Setup",
    summary: "Launch a complete online store — catalog, checkout, payments and branding.",
    description:
      "E-commerce through websites: a complete, ready-to-sell online store with catalog, checkout, payment gateways, branding and localization for GCC & European markets.",
    category: "LAUNCH_KIT" as const,
    licenseModel: "ONE_TIME" as const,
    tags: ["ecommerce", "store", "checkout", "payments"],
    featured: true,
  },
  {
    slug: "social-commerce-setup",
    code: "4791019",
    title: "Social Commerce Setup",
    summary: "Sell through social platforms — catalogs, storefronts and social checkout.",
    description:
      "E-commerce through social media: set up product catalogs, shoppable storefronts and checkout across Instagram, TikTok, WhatsApp and Facebook, with content and campaign support.",
    category: "MARKETPLACE_SOLUTION" as const,
    licenseModel: "ONE_TIME" as const,
    tags: ["social", "commerce", "instagram", "whatsapp"],
    featured: false,
  },
  {
    slug: "managed-it-network",
    code: "6202005",
    title: "Managed IT & Network Services",
    summary: "IT network setup, monitoring and ongoing managed support.",
    description:
      "Information technology network services: network design and setup, monitoring, security and ongoing managed support — billed as a subscription.",
    category: "PRODUCTIZED_SERVICE" as const,
    licenseModel: "SUBSCRIPTION" as const,
    tags: ["it", "network", "managed", "support"],
    featured: false,
  },
  {
    slug: "it-hardware-consultancy",
    code: "6202002",
    title: "IT Hardware & Equipment Consultancy",
    summary: "Advisory on computer devices, equipment and IT infrastructure procurement.",
    description:
      "Consultancy in the field of computer devices and equipment: infrastructure planning, vendor selection and procurement advisory for offices, data and retail environments.",
    category: "PRODUCTIZED_SERVICE" as const,
    licenseModel: "ONE_TIME" as const,
    tags: ["consultancy", "hardware", "infrastructure", "procurement"],
    featured: false,
  },
];

async function main() {
  for (const s of SERVICES) {
    const data = {
      slug: s.slug,
      title: s.title,
      summary: s.summary,
      description: s.description,
      category: s.category,
      licenseModel: s.licenseModel,
      region: "GLOBAL" as const,
      price: 0, // contact for pricing
      currency: "EUR",
      vendorName: "Unskinned",
      whiteLabel: false,
      tags: s.tags,
      techStack: [] as string[],
      images: [LOGO],
      demoMedia: [] as string[],
      featured: s.featured,
      published: true,
      source: "licensed_activity",
      externalId: s.code,
    };
    await prisma.solution.upsert({ where: { slug: s.slug }, update: data, create: data });
  }
  console.log(`Seeded ${SERVICES.length} Unskinned service packages.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
