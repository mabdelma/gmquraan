import { redirect } from "next/navigation";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { formatPrice } from "@/lib/format";
import { PLAN_PRICES } from "@/lib/plans";
import { RESELLER_COMMISSION_PERCENT } from "@/lib/reseller";
import { LiveRevenue } from "@/components/LiveRevenue";
import { getLocale } from "@/lib/i18n.server";
import { getCentralPages } from "@/lib/central-pages-i18n";
import { getCentralWidgets } from "@/lib/central-widgets-i18n";

export const dynamic = "force-dynamic";

export default async function CentralRevenuePage() {
  const admin = await getCentralAdmin();
  if (!admin) redirect("/central");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [growthActive, txns, planGroups, referralCoupons, usersCount] = await Promise.all([
    prisma.user.count({
      where: { role: "CLIENT", plan: "GROWTH", OR: [{ planExpiresAt: null }, { planExpiresAt: { gt: now } }] },
    }),
    prisma.paymentTransaction.findMany({
      where: { status: "COMPLETED" },
      select: { amount: true, completedAt: true, createdAt: true, couponId: true },
    }),
    prisma.user.groupBy({ by: ["plan"], _count: { plan: true } }),
    prisma.coupon.findMany({ where: { isReferral: true }, select: { id: true } }),
    prisma.user.count(),
  ]);
  const partnerSales = await prisma.partnerSale.aggregate({
    where: { status: "COMPLETED" },
    _sum: { amount: true, platformShare: true, partnerShare: true },
    _count: true,
  });
  const psGross = partnerSales._sum.amount ?? 0;
  const psPlatform = partnerSales._sum.platformShare ?? 0;
  const psPartner = partnerSales._sum.partnerShare ?? 0;
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const mrr = growthActive * PLAN_PRICES.GROWTH.EUR.cents;
  const arr = mrr * 12;
  const total = txns.reduce((a, t) => a + t.amount, 0);
  const month = txns
    .filter((t) => (t.completedAt ?? t.createdAt) >= monthStart)
    .reduce((a, t) => a + t.amount, 0);
  const refIds = new Set(referralCoupons.map((c) => c.id));
  const resellerRevenue = txns.filter((t) => t.couponId && refIds.has(t.couponId)).reduce((a, t) => a + t.amount, 0);
  const resellerPayouts = Math.round((resellerRevenue * RESELLER_COMMISSION_PERCENT) / 100);
  const platformNet = total - resellerPayouts;

  // last 6 months
  const months: { label: string; cents: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const cents = txns
      .filter((t) => {
        const w = t.completedAt ?? t.createdAt;
        return w >= d && w < next;
      })
      .reduce((a, t) => a + t.amount, 0);
    months.push({ label: d.toLocaleString("en", { month: "short" }), cents });
  }
  const peak = Math.max(1, ...months.map((m) => m.cents));
  const planCount = (p: string) => planGroups.find((g) => g.plan === p)?._count.plan ?? 0;

  // Simple forecast: trailing 3-month average monthly revenue → next month + next quarter.
  const last3 = months.slice(-3).map((m) => m.cents);
  const avg3 = Math.round(last3.reduce((a, c) => a + c, 0) / 3);
  const projectedQuarter = avg3 * 3;
  const today = txns.filter((t) => (t.completedAt ?? t.createdAt) >= dayStart).reduce((a, t) => a + t.amount, 0);

  const locale = await getLocale();
  const cpc = getCentralPages(locale);
  const cp = cpc.rev;
  const wt = getCentralWidgets(locale);

  const stat = (v: string, l: string) => (
    <div className="panel rounded-2xl p-5">
      <div className="text-2xl md:text-3xl font-extrabold app-gradient-text">{v}</div>
      <div className="text-[color:var(--ink)]/50 text-sm mt-1">{l}</div>
    </div>
  );

  return (
    <section className="mx-auto max-w-5xl px-5 py-14">
      <div className="flex items-center justify-between mt-4">
        <h1 className="text-3xl font-extrabold">{cp.title}</h1>
        <a href="/api/central/export?type=transactions" className="text-xs border border-[color:var(--hairline)] rounded-lg px-3 py-1.5 hover:bg-[color:var(--overlay)]">
          {cpc.exportCsv}
        </a>
      </div>

      <LiveRevenue initial={{ mrr, total, today, activeSubscriptions: growthActive, users: usersCount }} t={wt} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
        {stat(formatPrice(mrr, "EUR"), cp.mrr)}
        {stat(formatPrice(arr, "EUR"), cp.arr)}
        {stat(formatPrice(month, "EUR"), cp.thisMonth)}
        {stat(formatPrice(total, "EUR"), cp.allTime)}
      </div>

      <div className="grid md:grid-cols-3 gap-4 mt-4">
        {stat(formatPrice(platformNet, "EUR"), cp.platformNet)}
        {stat(formatPrice(resellerPayouts, "EUR"), `${cp.resellerPayouts} (${RESELLER_COMMISSION_PERCENT}%)`)}
        {stat(`${growthActive}`, cp.activeSubs)}
      </div>

      <h2 className="font-bold text-lg mt-12 mb-4">{cp.last6}</h2>
      <div className="panel rounded-2xl p-6 flex items-end gap-3 h-48">
        {months.map((m) => (
          <div key={m.label} className="flex-1 flex flex-col items-center justify-end h-full">
            <div
              className="w-full rounded-t app-gradient"
              style={{ height: `${Math.max(4, (m.cents / peak) * 100)}%` }}
              title={formatPrice(m.cents, "EUR")}
            />
            <div className="text-[10px] text-[color:var(--ink)]/55 mt-2">{m.label}</div>
          </div>
        ))}
      </div>

      <h2 className="font-bold text-lg mt-12 mb-4">{cp.forecast}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stat(formatPrice(avg3, "EUR"), cp.nextMonth)}
        {stat(formatPrice(projectedQuarter, "EUR"), cp.nextQuarter)}
        {stat(formatPrice(avg3 * 12, "EUR"), cp.runRate)}
      </div>
      <p className="text-[color:var(--ink)]/55 text-xs mt-3">{cp.forecastNote}</p>

      <h2 className="font-bold text-lg mt-12 mb-4">{cp.partnerSales}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stat(formatPrice(psGross, "EUR"), cp.gross)}
        {stat(formatPrice(psPlatform, "EUR"), cp.platformShare)}
        {stat(formatPrice(psPartner, "EUR"), cp.partnerPayouts)}
        {stat(`${partnerSales._count}`, cp.salesReported)}
      </div>

      <h2 className="font-bold text-lg mt-12 mb-4">{cp.subscriptions}</h2>
      <div className="grid grid-cols-3 gap-4">
        {stat(`${planCount("STARTER")}`, cp.starter)}
        {stat(`${planCount("GROWTH")}`, cp.growth)}
        {stat(`${planCount("ENTERPRISE")}`, cp.enterprise)}
      </div>
    </section>
  );
}
