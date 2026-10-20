import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { getLocale } from "@/lib/i18n.server";
import { getCentralMessages } from "@/lib/central-i18n";
import { getCentralPages } from "@/lib/central-pages-i18n";
import { CentralLoginForm } from "@/components/CentralLoginForm";
import { CouponForm } from "@/components/CouponForm";
import { ReviewModerationRow } from "@/components/ReviewModerationRow";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { PushOptIn } from "@/components/PushOptIn";
import { ContactSettingsForm } from "@/components/ContactSettingsForm";
import { CentralTwoFactor } from "@/components/CentralTwoFactor";
import { getContactSettings } from "@/lib/settings";
import { getPushMessages } from "@/lib/push-i18n";
import { getChangePwLabels, getCouponLabels, getUiB } from "@/lib/ui-i18n";

export const dynamic = "force-dynamic";

export default async function CentralPage() {
  const admin = await getCentralAdmin();
  if (!admin) {
    const lc = await getLocale();
    return <CentralLoginForm t={getCentralMessages(lc).login} locale={lc} />;
  }

  const [roleCounts, solutions, leads, coupons, pendingReviews, recentLeads] = await Promise.all([
    prisma.user.groupBy({ by: ["role"], _count: { role: true } }),
    prisma.solution.count(),
    prisma.lead.count(),
    prisma.coupon.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.review.findMany({
      where: { approved: false },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { reviewer: { select: { name: true, email: true } } }
    }),
    prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { solution: { select: { title: true } } } })
  ]);

  const locale = await getLocale();
  const contact = await getContactSettings();
  const twoFa = await prisma.user.findUnique({ where: { id: admin.id }, select: { totpEnabled: true } });
  const cp0 = getCentralPages(locale);
  const c = cp0.ov;
  const cnt = (r: string) => roleCounts.find((x) => x.role === r)?._count.role ?? 0;
  const clients = cnt("CLIENT");
  const partners = cnt("PARTNER");
  const resellers = cnt("RESELLER");
  const admins = cnt("ADMIN") + cnt("SUPER_ADMIN");

  const stat = (n: number, l: string) => (
    <div className="panel rounded-2xl p-5">
      <div className="text-3xl font-extrabold app-gradient-text">{n}</div>
      <div className="text-[color:var(--ink)]/50 text-sm mt-1">{l}</div>
    </div>
  );

  return (
    <section className="mx-auto max-w-6xl px-5 py-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold">{c.title}</h1>
          <p className="text-[color:var(--ink)]/50 text-sm mt-1">{c.subtitle}</p>
        </div>
        <PushOptIn endpoint="/api/central/devices/register" t={getPushMessages(locale)} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-8">
        {stat(clients, c.clients)}
        {stat(partners, c.partners)}
        {stat(resellers, c.resellers)}
        {stat(admins, c.admins)}
        {stat(solutions, c.solutions)}
        {stat(leads, c.leads)}
      </div>

      <div className="grid gap-10 mt-12 md:grid-cols-2">
        <div>
          <h2 className="font-bold text-lg mb-4">{c.createCoupon}</h2>
          <div className="panel rounded-2xl p-6">
            <CouponForm t={getCouponLabels(locale)} />
          </div>
          {coupons.length > 0 && (
            <ul className="mt-4 space-y-2 text-sm">
              {coupons.map((c) => (
                <li key={c.id} className="flex justify-between panel rounded-lg px-3 py-2">
                  <span className="font-mono">{c.code}</span>
                  <span className="text-[color:var(--ink)]/50">
                    {c.discountType === "PERCENT" ? `${c.amount}%` : `€${(c.amount / 100).toFixed(0)}`} · {c.redemptions}
                    {c.maxRedemptions ? `/${c.maxRedemptions}` : ""} {getUiB(locale).used}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-10">
            <ContactSettingsForm initial={contact.whatsapp} locale={locale} />
          </div>
        </div>

        <div>
          <h2 className="font-bold text-lg mb-4">{c.pendingReviews} ({pendingReviews.length})</h2>
          <div className="space-y-3">
            {pendingReviews.length === 0 ? (
              <p className="text-[color:var(--ink)]/55 text-sm panel rounded-2xl p-6">{c.nothingModerate}</p>
            ) : (
              pendingReviews.map((r) => (
                <ReviewModerationRow
                  key={r.id}
                  id={r.id}
                  rating={r.rating}
                  title={r.title}
                  content={r.content}
                  reviewer={r.reviewer.name || r.reviewer.email}
                  approved={r.approved}
                />
              ))
            )}
          </div>

          <h2 className="font-bold text-lg mt-10 mb-4">{c.changePassword}</h2>
          <div className="panel rounded-2xl p-6">
            <ChangePasswordForm endpoint="/api/central/password" t={getChangePwLabels(locale)} />
          </div>

          <div className="mt-6">
            <CentralTwoFactor enabled={!!twoFa?.totpEnabled} locale={locale} />
          </div>

          <div className="flex items-center justify-between mt-10 mb-4">
            <h2 className="font-bold text-lg">{c.recentLeads}</h2>
            <a href="/api/central/export?type=leads" className="text-xs border border-[color:var(--hairline)] rounded-lg px-3 py-1.5 hover:bg-[color:var(--overlay)]">
              {cp0.exportCsv}
            </a>
          </div>
          <ul className="space-y-2">
            {recentLeads.map((l) => (
              <li key={l.id} className="panel rounded-lg px-4 py-3 text-sm flex justify-between">
                <div>
                  <div className="font-semibold">{l.name}</div>
                  <div className="text-xs text-[color:var(--ink)]/55">{l.solution?.title || l.source || "—"}</div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full border border-[color:var(--hairline)] h-fit">{l.status}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
