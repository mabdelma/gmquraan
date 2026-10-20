import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@app/db";
import { Section } from "@/components/Section";
import { getLocale } from "@/lib/i18n.server";
import { translateBatch } from "@/lib/translate";
import { RESELLER_COMMISSION_PERCENT } from "@/lib/reseller";
import { PARTNER_REVENUE_SHARE_PERCENT } from "@/lib/partner-policy";

export const metadata: Metadata = {
  title: "SaaS Partnership Hub",
  description: "The Unskinned SaaS partnership ecosystem — partners build, we deploy, market, sell and bill, and share the revenue.",
};
export const dynamic = "force-dynamic";

const EN = {
  eyebrow: "SaaS Partnership Hub",
  title: "Build, distribute, and earn across the Unskinned ecosystem",
  subtitle:
    "Unskinned is the deployment, marketing, and sales platform for SaaS products. Partners build the product; we handle hosting, marketing, sales, billing and support — and share the revenue.",
  solutionsLabel: "Solutions live",
  partnersLabel: "Technology partners",
  shareLabel: "Standard partner revenue share",
  commLabel: "Reseller commission",
  forPartnersH: "For Partners",
  forPartnersP:
    "List your SaaS on the marketplace and earn a revenue share on every sale. We market, sell, onboard and bill — you focus on the product.",
  forResellersH: "For Resellers",
  forResellersP:
    "Promote any solution with your referral code. Buyers save with your code; you earn commission on the sale and every renewal.",
  forClientsH: "For Clients",
  forClientsP:
    "Deploy ready-made, vetted digital solutions across the GCC and Europe — no custom build required.",
  ctaH: "Ready to join the ecosystem?",
  becomePartner: "Become a partner",
  browse: "Browse the marketplace",
};

export default async function HubPage() {
  const locale = await getLocale();
  const [solutions, partners] = await Promise.all([
    prisma.solution.count({ where: { published: true } }),
    prisma.user.count({ where: { role: "PARTNER" } }),
  ]);

  const keys = Object.keys(EN) as (keyof typeof EN)[];
  const vals = await translateBatch(keys.map((k) => EN[k]), locale);
  const t = Object.fromEntries(keys.map((k, i) => [k, vals[i]])) as typeof EN;

  const stat = (v: string, l: string) => (
    <div>
      <div className="text-3xl md:text-4xl font-extrabold app-gradient-text">{v}</div>
      <div className="text-[color:var(--ink)]/50 text-sm mt-1">{l}</div>
    </div>
  );
  const card = (h: string, p: string) => (
    <div className="panel rounded-2xl p-6">
      <h3 className="font-bold text-lg">{h}</h3>
      <p className="text-[color:var(--ink)]/55 text-sm mt-2 leading-relaxed">{p}</p>
    </div>
  );

  return (
    <>
      <Section eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-4 max-w-3xl">
          {stat(String(solutions), t.solutionsLabel)}
          {stat(String(partners), t.partnersLabel)}
          {stat(`${PARTNER_REVENUE_SHARE_PERCENT}%`, t.shareLabel)}
          {stat(`${RESELLER_COMMISSION_PERCENT}%`, t.commLabel)}
        </div>

        <div className="grid gap-6 md:grid-cols-3 mt-10">
          {card(t.forPartnersH, t.forPartnersP)}
          {card(t.forResellersH, t.forResellersP)}
          {card(t.forClientsH, t.forClientsP)}
        </div>
      </Section>

      <Section eyebrow={t.eyebrow} title={t.ctaH}>
        <div className="flex flex-wrap gap-3">
          <Link href="/partners" className="app-gradient text-[color:var(--on-accent)] font-bold px-6 py-3 rounded-xl">
            {t.becomePartner}
          </Link>
          <Link href="/marketplace" className="border border-[color:var(--hairline)] px-6 py-3 rounded-xl hover:bg-[color:var(--overlay)]">
            {t.browse}
          </Link>
        </div>
      </Section>
    </>
  );
}
