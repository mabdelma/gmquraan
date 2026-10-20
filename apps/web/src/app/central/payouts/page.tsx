import { redirect } from "next/navigation";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { formatPrice } from "@/lib/format";
import { RESELLER_COMMISSION_PERCENT } from "@/lib/reseller";
import { PAYOUT_MIN_THRESHOLD_CENTS } from "@/lib/partner-policy";
import { RecordPayoutButton } from "@/components/RecordPayoutButton";
import { getLocale } from "@/lib/i18n.server";
import { getCentralPages } from "@/lib/central-pages-i18n";
import { getCentralWidgets } from "@/lib/central-widgets-i18n";

export const dynamic = "force-dynamic";

export default async function CentralPayoutsPage() {
  const admin = await getCentralAdmin();
  if (!admin) redirect("/central");

  // Per-user earnings: reseller commission (referral coupons + cross-product sales) + partner 50% share.
  const acc = new Map<string, { name: string; resellerRevenue: number; partnerShare: number; extCommission: number }>();
  const ensure = (id: string, name: string) => {
    let e = acc.get(id);
    if (!e) acc.set(id, (e = { name, resellerRevenue: 0, partnerShare: 0, extCommission: 0 }));
    return e;
  };

  const coupons = await prisma.coupon.findMany({
    where: { isReferral: true, ownerId: { not: null } },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      transactions: { where: { status: "COMPLETED" }, select: { amount: true } }
    }
  });
  for (const c of coupons) {
    if (!c.owner) continue;
    ensure(c.owner.id, c.owner.name || c.owner.email).resellerRevenue += c.transactions.reduce((a, t) => a + t.amount, 0);
  }

  const sales = await prisma.partnerSale.groupBy({
    by: ["ownerId"],
    where: { status: "COMPLETED" },
    _sum: { partnerShare: true }
  });
  if (sales.length) {
    const owners = await prisma.user.findMany({
      where: { id: { in: sales.map((s) => s.ownerId) } },
      select: { id: true, name: true, email: true }
    });
    const omap = new Map(owners.map((o) => [o.id, o.name || o.email]));
    for (const s of sales) ensure(s.ownerId, omap.get(s.ownerId) || s.ownerId).partnerShare += s._sum.partnerShare ?? 0;
  }

  // Cross-product reseller commission (ResellerSale reported by other products).
  const extSales = await prisma.resellerSale.groupBy({
    by: ["resellerId"],
    where: { status: "COMPLETED" },
    _sum: { commission: true }
  });
  if (extSales.length) {
    const rs = await prisma.user.findMany({
      where: { id: { in: extSales.map((s) => s.resellerId) } },
      select: { id: true, name: true, email: true }
    });
    const rmap = new Map(rs.map((o) => [o.id, o.name || o.email]));
    for (const s of extSales) ensure(s.resellerId, rmap.get(s.resellerId) || s.resellerId).extCommission += s._sum.commission ?? 0;
  }

  const paidRows = await prisma.payout.groupBy({ by: ["resellerId"], _sum: { amount: true } });
  const paidMap = new Map(paidRows.map((r) => [r.resellerId, r._sum.amount ?? 0]));

  const rows = [...acc.entries()]
    .map(([id, v]) => {
      const resellerCommission = Math.round((v.resellerRevenue * RESELLER_COMMISSION_PERCENT) / 100) + v.extCommission;
      const earned = resellerCommission + v.partnerShare;
      const paid = paidMap.get(id) ?? 0;
      return { id, name: v.name, partnerShare: v.partnerShare, resellerCommission, earned, paid, owed: Math.max(0, earned - paid) };
    })
    .filter((r) => r.earned > 0 || r.paid > 0)
    .sort((a, b) => b.owed - a.owed);

  const locale = await getLocale();
  const cpc = getCentralPages(locale);
  const cp = cpc.pay;
  const wt = getCentralWidgets(locale);

  const recent = await prisma.payout.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { reseller: { select: { name: true, email: true } } }
  });

  return (
    <section className="mx-auto max-w-4xl px-5 py-14">
      <div className="flex items-center justify-between mt-4">
        <h1 className="text-3xl font-extrabold">{cp.title}</h1>
        <a href="/api/central/export?type=payouts" className="inline-flex items-center min-h-11 text-xs border border-[color:var(--hairline)] rounded-lg px-3 py-1.5 hover:bg-[color:var(--overlay)]">
          {cpc.exportCsv}
        </a>
      </div>
      <p className="text-[color:var(--ink)]/50 mt-2 text-sm">{cp.subtitle}</p>

      {rows.length === 0 ? (
        <p className="text-[color:var(--ink)]/55 text-sm panel rounded-2xl p-6 mt-8">{cp.none}</p>
      ) : (
        <div className="panel rounded-2xl p-6 mt-8 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-widest text-[color:var(--ink)]/55">
                <th className="pb-3 pr-4">{cp.partnerReseller}</th>
                <th className="pb-3 pr-4">{cp.partnerShare}</th>
                <th className="pb-3 pr-4">{cp.resellerComm}</th>
                <th className="pb-3 pr-4">{cp.earned}</th>
                <th className="pb-3 pr-4">{cp.paid}</th>
                <th className="pb-3 pr-4">{cp.owed}</th>
                <th className="pb-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-[color:var(--hairline)]">
                  <td className="py-3 pr-4">{r.name}</td>
                  <td className="py-3 pr-4 text-[color:var(--ink)]/60">{formatPrice(r.partnerShare, "EUR")}</td>
                  <td className="py-3 pr-4 text-[color:var(--ink)]/60">{formatPrice(r.resellerCommission, "EUR")}</td>
                  <td className="py-3 pr-4">{formatPrice(r.earned, "EUR")}</td>
                  <td className="py-3 pr-4 text-[color:var(--ink)]/50">{formatPrice(r.paid, "EUR")}</td>
                  <td className="py-3 pr-4 font-semibold text-[color:var(--accent-text)]">{formatPrice(r.owed, "EUR")}</td>
                  <td className="py-3">
                    {r.owed < PAYOUT_MIN_THRESHOLD_CENTS ? (
                      <span className="text-xs text-[color:var(--ink)]/55">{cp.rollsOver}</span>
                    ) : (
                      <RecordPayoutButton resellerId={r.id} amount={r.owed} t={wt} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {recent.length > 0 && (
        <>
          <h2 className="font-bold text-lg mt-12 mb-4">{cp.recent}</h2>
          <ul className="space-y-2">
            {recent.map((p) => (
              <li key={p.id} className="panel rounded-lg px-4 py-3 text-sm flex justify-between">
                <span>{p.reseller.name || p.reseller.email}</span>
                <span className="text-[color:var(--ink)]/50">
                  {formatPrice(p.amount, p.currency)} · {p.paidAt?.toLocaleDateString() ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
