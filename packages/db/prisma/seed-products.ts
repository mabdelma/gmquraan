import { prisma } from "../src/index.js";

/**
 * Links the Unskinned product portfolio (the live apps) into the
 * Unskinned marketplace as Solutions, each pointing at its live site via `url`.
 * Idempotent (upsert by slug) — safe to re-run.
 */
const PRODUCTS = [
  {
    slug: "partner-one",
    title: "the upstream platform — AI Real Estate Platform",
    summary: "AI-powered property matching for buyers, sellers, tenants and investors.",
    description:
      "Where real estate and AI finally swipe right. the upstream platform matches people with the right properties using AI — personalized recommendations, market insights, and end-to-end transaction tools across the whole journey.",
    category: "AI_AUTOMATION" as const,
    region: "GLOBAL" as const,
    tags: ["ai", "real-estate", "proptech", "matching"],
    techStack: ["Next.js", "OpenAI", "PostgreSQL"],
    url: "https://partner-one.example",
    featured: true,
  },
  {
    slug: "app-mall",
    title: "Unskinned Mall — Virtual Mall Platform",
    summary: "All-in-one platform for shops, services and payments — launch a branded storefront, no code.",
    description:
      "Unskinned Mall is a unified digital marketplace where retailers, service providers and professionals launch branded online storefronts without technical skills. E-commerce, appointment booking and secure payments in one platform.",
    category: "MARKETPLACE_SOLUTION" as const,
    region: "GLOBAL" as const,
    tags: ["ecommerce", "marketplace", "storefront", "payments", "booking"],
    techStack: ["Next.js", "Stripe"],
    url: "https://partner-four.example",
    featured: true,
  },
  {
    slug: "qlisted",
    title: "Qlisted — QR Ordering for Restaurants",
    summary: "Let diners browse the menu and order by scanning a QR code.",
    description:
      "Qlisted modernizes restaurant service: customers scan a QR code to browse the menu and place orders, streamlining ordering and payment for dining establishments.",
    category: "SAAS_PLATFORM" as const,
    region: "GLOBAL" as const,
    tags: ["restaurant", "qr", "ordering", "hospitality"],
    techStack: ["Next.js"],
    url: "https://partner-two.example",
    featured: false,
  },
  {
    slug: "entrequipos",
    title: "EntrEquipos — Team Event Management",
    summary: "Manage team events, registrations, submissions and evaluation workflows.",
    description:
      "EntrEquipos is a team event management system for organizers to run competitions and coordinate participant submissions, with collaboration and progress tracking for teams, judges and event hosts.",
    category: "SAAS_PLATFORM" as const,
    region: "EUROPE" as const,
    tags: ["events", "teams", "competitions", "evaluation"],
    techStack: ["Next.js", "PostgreSQL"],
    url: "https://partner-three.example",
    featured: false,
  },
  {
    slug: "partner-five",
    title: "QCart — E-commerce Cart & Checkout",
    summary: "Lightweight cart, checkout and QR ordering for online stores.",
    description:
      "QCart provides a fast cart, checkout and QR-based ordering flow for online stores and vendors on the Unskinned Mall ecosystem.",
    category: "SAAS_PLATFORM" as const,
    region: "GLOBAL" as const,
    tags: ["ecommerce", "cart", "checkout", "payments"],
    techStack: ["Next.js", "Stripe"],
    url: "https://five.partner-four.example",
    featured: false,
  },
  {
    slug: "mj-videos",
    title: "MJ Videos — Video Management (Vidmox)",
    summary: "Video content management and analytics, powered by Vidmox.",
    description:
      "MJ Videos is a video content management and analytics platform (powered by Vidmox) for publishing, organizing and tracking the performance of video content.",
    category: "SAAS_PLATFORM" as const,
    region: "GLOBAL" as const,
    tags: ["video", "analytics", "media", "streaming"],
    techStack: ["Next.js", "MinIO", "NATS"],
    url: "https://six.partner-four.example",
    featured: false,
  },
  {
    slug: "vidmox",
    title: "Vidmox — Video Infrastructure SaaS",
    summary: "Scalable, developer-first video infrastructure — upload, transcode, store and stream via API.",
    description:
      "Vidmox is a developer-first video infrastructure platform: APIs for upload, transcoding, storage (S3/MinIO) and streaming, with event-driven processing (NATS) and analytics. White-label backbone behind products like MJ Videos.",
    category: "AI_AUTOMATION" as const,
    region: "GLOBAL" as const,
    tags: ["video", "api", "infrastructure", "transcoding", "streaming", "developer"],
    techStack: ["Node.js", "PostgreSQL", "MinIO", "NATS", "Redis"],
    url: null as string | null,
    featured: false,
  },
  {
    slug: "vps",
    title: "Qarrito — Affiliate Marketing Platform",
    summary: "Multi-site affiliate marketing platform with Awin, Impact, Shopify & WooCommerce integrations.",
    description:
      "Qarrito is a multi-site affiliate marketing and content monetization platform — onboard affiliates, plug into networks (Awin, Impact) and e-commerce (Shopify, WooCommerce), and run multiple branded sites from one platform.",
    category: "MARKETPLACE_SOLUTION" as const,
    region: "GLOBAL" as const,
    tags: ["affiliate", "marketing", "multi-site", "monetization", "awin", "impact"],
    techStack: ["Next.js", "PostgreSQL", "Redis"],
    url: null as string | null,
    featured: false,
  },
];

const LOGO = "/logo.svg"; // Unskinned golden brand mark

async function main() {
  for (const p of PRODUCTS) {
    const data = {
      ...p,
      price: 0, // portfolio showcase — "Contact for pricing"
      currency: "EUR",
      licenseModel: "SUBSCRIPTION" as const,
      vendorName: "Unskinned",
      whiteLabel: true,
      published: true,
      images: [LOGO],
      demoMedia: [] as string[],
    };
    await prisma.solution.upsert({ where: { slug: p.slug }, update: data, create: data });
  }
  console.log(`Linked ${PRODUCTS.length} products into the Unskinned marketplace.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
