import { redirect } from "next/navigation";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { formatPrice } from "@/lib/format";
import { RESELLER_COMMISSION_PERCENT } from "@/lib/reseller";
import { getLocale } from "@/lib/i18n.server";
import { getEmptyLabels } from "@/lib/ui-i18n";
import { getCentralPages } from "@/lib/central-pages-i18n";
import { translateBatch } from "@/lib/translate";
import { ProductKeyManager } from "@/components/ProductKeyManager";

export const dynamic = "force-dynamic";

export default async function CentralResellersPage() {
  const admin = await getCentralAdmin();
  if (!admin) redirect("/central");

  const [coupons, extSales, bySource, productKeys] = await Promise.all([
    prisma.coupon.findMany({
      where: { isReferral: true },
      orderBy: { redemptions: "desc" },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        transactions: { where: { status: "COMPLETED" }, select: { amount: true } }
      }
    }),
    // Cross-product attributed sales grouped per reseller.
    prisma.resellerSale.groupBy({
      by: ["resellerId"],
      where: { status: "COMPLETED" },
      _sum: { amount: true, commission: true },
      _count: true
    }),
    // SaaS portfolio: cross-product sales grouped per connected product (source).
    prisma.resellerSale.groupBy({
      by: ["source"],
      where: { status: "COMPLETED" },
      _sum: { amount: true, commission: true },
      _count: true
    }),
    prisma.productKey.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, prefix: true, active: true, lastUsedAt: true, createdAt: true, revokedAt: true, syncUrl: true }
    })
  ]);

  const extByReseller = new Map(extSales.map((s) => [s.resellerId, s]));
  const portfolio = [...bySource].sort((a, b) => (b._sum.amount ?? 0) - (a._sum.amount ?? 0));
  const totalGross = portfolio.reduce((a, s) => a + (s._sum.amount ?? 0), 0);
  const totalComm = portfolio.reduce((a, s) => a + (s._sum.commission ?? 0), 0);
  const locale = await getLocale();
  const cp = getCentralPages(locale).res;
  const empty = getEmptyLabels(locale);
  const baseUrl = process.env.APP_URL || "https://example.com";
  const pkRows = productKeys.map((k) => ({ ...k, lastUsedAt: k.lastUsedAt?.toISOString() ?? null, createdAt: k.createdAt.toISOString(), revokedAt: k.revokedAt?.toISOString() ?? null }));
  const [L_portfolio, L_portfolioSub, L_totalGross, L_commissionWord, L_thProduct, L_thSales, L_thGross, L_thCommission, L_connected, L_connectedSub] =
    await translateBatch(
      [
        "SaaS portfolio",
        "Cross-product reseller activity per connected product.",
        "Total gross",
        "commission",
        "Product",
        "Sales",
        "Gross",
        "Commission",
        "Connected products",
        `Issue an API key to another product so it can validate reseller codes and report sales — the reseller earns commission (${RESELLER_COMMISSION_PERCENT}%) on those too.`
      ],
      locale
    );

  return (
    <section className="mx-auto max-w-4xl px-5 py-10">
      <h1 className="text-2xl font-extrabold">{cp.title} ({coupons.length})</h1>
      <p className="text-[color:var(--ink)]/50 mt-1 text-sm">{cp.subtitle}</p>

      {coupons.length === 0 ? (
        <p className="text-[color:var(--ink)]/55 text-sm panel rounded-2xl p-6 mt-8">{cp.none}</p>
      ) : (
        <div className="panel rounded-2xl p-6 mt-8 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-widest text-[color:var(--ink)]/55">
                <th className="pb-3 pr-4">{cp.reseller}</th>
                <th className="pb-3 pr-4">{cp.code}</th>
                <th className="pb-3 pr-4">{cp.redemptions}</th>
                <th className="pb-3 pr-4">{cp.revenue}</th>
                <th className="pb-3">{cp.commission}</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => {
                const ext = c.owner ? extByReseller.get(c.owner.id) : undefined;
                const revenue = c.transactions.reduce((a, t) => a + t.amount, 0) + (ext?._sum.amount ?? 0);
                const commission =
                  Math.round((c.transactions.reduce((a, t) => a + t.amount, 0) * RESELLER_COMMISSION_PERCENT) / 100) +
                  (ext?._sum.commission ?? 0);
                return (
                  <tr key={c.id} className="border-t border-[color:var(--hairline)]">
                    <td className="py-3 pr-4">{c.owner?.name || c.owner?.email || "—"}</td>
                    <td className="py-3 pr-4 font-mono text-[color:var(--accent-text)]">{c.code}</td>
                    <td className="py-3 pr-4">{c.redemptions + (ext?._count ?? 0)}</td>
                    <td className="py-3 pr-4">{formatPrice(revenue, "EUR")}</td>
                    <td className="py-3">{formatPrice(commission, "EUR")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="font-bold text-lg mt-12 mb-1">{L_portfolio}</h2>
      <p className="text-[color:var(--ink)]/50 text-sm mb-4">
        {L_portfolioSub}
        {portfolio.length > 0 && (
          <> {L_totalGross} <span className="text-[color:var(--ink)]/80">{formatPrice(totalGross, "EUR")}</span> · {L_commissionWord}{" "}
          <span className="text-[color:var(--accent-text)]">{formatPrice(totalComm, "EUR")}</span>.</>
        )}
      </p>
      {portfolio.length === 0 ? (
        <p className="text-[color:var(--ink)]/55 text-sm panel rounded-2xl p-6">{empty.resellerSales}</p>
      ) : (
        <div className="panel rounded-2xl p-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-widest text-[color:var(--ink)]/55">
                <th className="pb-3 pr-4">{L_thProduct}</th>
                <th className="pb-3 pr-4">{L_thSales}</th>
                <th className="pb-3 pr-4">{L_thGross}</th>
                <th className="pb-3">{L_thCommission}</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.map((s) => (
                <tr key={s.source} className="border-t border-[color:var(--hairline)]">
                  <td className="py-3 pr-4 font-medium">{s.source}</td>
                  <td className="py-3 pr-4">{s._count}</td>
                  <td className="py-3 pr-4">{formatPrice(s._sum.amount ?? 0, "EUR")}</td>
                  <td className="py-3 text-[color:var(--accent-text)]">{formatPrice(s._sum.commission ?? 0, "EUR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="font-bold text-lg mt-12 mb-1">{L_connected}</h2>
      <p className="text-[color:var(--ink)]/50 text-sm mb-4">{L_connectedSub}</p>
      <ProductKeyManager keys={pkRows} baseUrl={baseUrl} />
    </section>
  );
}
