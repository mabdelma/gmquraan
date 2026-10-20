import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n.server";
import { POLICY_I18N } from "@/lib/partner-policy-i18n";
import { PARTNER_REVENUE_SHARE_PERCENT } from "@/lib/partner-policy";

export const metadata: Metadata = {
  title: "Partner Policy & Agreement — Unskinned",
  description:
    "The official partnership framework between Unskinned and its registered technology partners: revenue split, responsibilities, IP, exclusivity, and the commercial umbrella.",
};

export default async function PartnerPolicyPage() {
  const locale = await getLocale();
  const c = POLICY_I18N[locale] ?? POLICY_I18N.en!;
  const platform = PARTNER_REVENUE_SHARE_PERCENT;
  const partner = 100 - PARTNER_REVENUE_SHARE_PERCENT;

  return (
    <article className="mx-auto max-w-3xl px-5 py-16">
      <p className="text-xs uppercase tracking-widest text-[color:var(--accent-text)]">{c.eyebrow}</p>
      <h1 className="text-3xl md:text-4xl font-extrabold mt-2">{c.title}</h1>
      <p className="text-[color:var(--ink)]/50 mt-2 text-sm">{c.effective}</p>

      <div className="panel rounded-xl p-4 grid grid-cols-2 gap-2 max-w-sm mt-8">
        <div>{c.splitPlatform}</div>
        <div className="text-right font-bold app-gradient-text">{platform}%</div>
        <div>{c.splitPartner}</div>
        <div className="text-right font-bold app-gradient-text">{partner}%</div>
      </div>

      {c.sections.map((s) => (
        <section key={s.h} className="mt-8">
          <h2 className="text-lg font-bold app-gradient-text">{s.h}</h2>
          <p className="mt-2 text-[color:var(--ink)]/70 text-sm leading-relaxed">{s.p}</p>
        </section>
      ))}

      <p className="text-[color:var(--ink)]/55 text-sm mt-10 border-t border-[color:var(--hairline)] pt-5">{c.acceptHint}</p>
      <p className="text-[color:var(--ink)]/55 text-xs mt-2">{c.canonical}</p>
    </article>
  );
}
