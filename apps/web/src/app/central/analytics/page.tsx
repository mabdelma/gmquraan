import { redirect } from "next/navigation";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { getLocale } from "@/lib/i18n.server";
import type { Locale } from "@/lib/i18n";
import { getCentralPages } from "@/lib/central-pages-i18n";

export const dynamic = "force-dynamic";

const B: Record<Locale, Record<string, string>> = {
  en: { business: "Business", revenue: "Revenue (all-time)", rev30: "Revenue (30d)", subs: "Active subscriptions", newU7: "New users (7d)", newU30: "New users (30d)", byPlan: "Revenue by plan", leads: "Lead pipeline", quotes: "Quotes", traffic: "Traffic", none: "No data yet." },
  es: { business: "Negocio", revenue: "Ingresos (histórico)", rev30: "Ingresos (30d)", subs: "Suscripciones activas", newU7: "Usuarios nuevos (7d)", newU30: "Usuarios nuevos (30d)", byPlan: "Ingresos por plan", leads: "Embudo de leads", quotes: "Presupuestos", traffic: "Tráfico", none: "Aún no hay datos." },
  fr: { business: "Activité", revenue: "Revenus (total)", rev30: "Revenus (30j)", subs: "Abonnements actifs", newU7: "Nouveaux utilisateurs (7j)", newU30: "Nouveaux utilisateurs (30j)", byPlan: "Revenus par forfait", leads: "Pipeline de leads", quotes: "Devis", traffic: "Trafic", none: "Pas encore de données." },
  
  pt: { business: "Negócio", revenue: "Receita (total)", rev30: "Receita (30d)", subs: "Assinaturas ativas", newU7: "Novos usuários (7d)", newU30: "Novos usuários (30d)", byPlan: "Receita por plano", leads: "Funil de leads", quotes: "Orçamentos", traffic: "Tráfego", none: "Ainda sem dados." },

  ar: { business: "الأعمال", revenue: "الإيرادات (الإجمالية)", rev30: "الإيرادات (30 يوم)", subs: "الاشتراكات النشطة", newU7: "مستخدمون جدد (7 أيام)", newU30: "مستخدمون جدد (30 يوم)", byPlan: "الإيرادات حسب الخطة", leads: "مسار العملاء", quotes: "عروض الأسعار", traffic: "الزيارات", none: "لا بيانات بعد." }

  
};

export default async function CentralAnalyticsPage() {
  const admin = await getCentralAdmin();
  if (!admin) redirect("/central");

  const since7 = new Date(Date.now() - 7 * 24 * 3600_000);
  const since30 = new Date(Date.now() - 30 * 24 * 3600_000);

  const [total, last7, last30, topPaths, revAll, rev30, subs, newU7, newU30, leadsBy, quotesBy, revByPlan] = await Promise.all([
    prisma.pageView.count(),
    prisma.pageView.count({ where: { createdAt: { gte: since7 } } }),
    prisma.pageView.count({ where: { createdAt: { gte: since30 } } }),
    prisma.pageView.groupBy({ by: ["path"], _count: { path: true }, orderBy: { _count: { path: "desc" } }, take: 15 }),
    prisma.paymentTransaction.aggregate({ where: { status: "COMPLETED" }, _sum: { amount: true } }),
    prisma.paymentTransaction.aggregate({ where: { status: "COMPLETED", createdAt: { gte: since30 } }, _sum: { amount: true } }),
    prisma.user.count({ where: { stripeSubscriptionId: { not: null } } }),
    prisma.user.count({ where: { createdAt: { gte: since7 } } }),
    prisma.user.count({ where: { createdAt: { gte: since30 } } }),
    prisma.lead.groupBy({ by: ["status"], _count: { status: true } }).catch(() => []),
    prisma.quote.groupBy({ by: ["status"], _count: { status: true } }).catch(() => []),
    prisma.paymentTransaction.groupBy({ by: ["plan"], where: { status: "COMPLETED" }, _sum: { amount: true } }).catch(() => [])
  ]);

  const locale = await getLocale();
  const c = getCentralPages(locale).ana;
  const b = B[locale] ?? B.en;
  const eur = (cents: number) => `€${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  const stat = (v: string, l: string) => (
    <div className="panel rounded-2xl p-5">
      <div className="text-2xl font-extrabold app-gradient-text">{v}</div>
      <div className="text-[color:var(--ink)]/50 text-sm mt-1">{l}</div>
    </div>
  );

  return (
    <section className="mx-auto max-w-4xl px-5 py-10">
      <h1 className="text-2xl font-extrabold">{c.title}</h1>
      <p className="text-[color:var(--ink)]/50 mt-1 text-sm">{c.subtitle}</p>

      {/* Business */}
      <h2 className="font-bold text-lg mt-8 mb-4">{b.business}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stat(eur(revAll._sum.amount ?? 0), b.revenue)}
        {stat(eur(rev30._sum.amount ?? 0), b.rev30)}
        {stat(subs.toLocaleString(), b.subs)}
        {stat(newU30.toLocaleString(), b.newU30)}
        {stat(newU7.toLocaleString(), b.newU7)}
      </div>

      <div className="grid md:grid-cols-3 gap-6 mt-8">
        <Breakdown title={b.byPlan} rows={revByPlan.map((r) => [r.plan, eur(r._sum.amount ?? 0)])} none={b.none} />
        <Breakdown title={b.leads} rows={leadsBy.map((r) => [r.status, String(r._count.status)])} none={b.none} />
        <Breakdown title={b.quotes} rows={quotesBy.map((r) => [r.status, String(r._count.status)])} none={b.none} />
      </div>

      {/* Traffic */}
      <h2 className="font-bold text-lg mt-12 mb-4">{b.traffic}</h2>
      <div className="grid grid-cols-3 gap-4">
        {stat(last7.toLocaleString(), c.v7)}
        {stat(last30.toLocaleString(), c.v30)}
        {stat(total.toLocaleString(), c.vAll)}
      </div>

      <h3 className="font-bold mt-8 mb-3">{c.topPages}</h3>
      {topPaths.length === 0 ? (
        <p className="text-[color:var(--ink)]/55 text-sm panel rounded-2xl p-6">{c.noData}</p>
      ) : (
        <ul className="space-y-2">
          {topPaths.map((p) => (
            <li key={p.path} className="flex justify-between panel rounded-lg px-4 py-2 text-sm">
              <span className="font-mono text-[color:var(--ink)]/70 truncate">{p.path}</span>
              <span className="text-[color:var(--ink)]/50">{p._count.path.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Breakdown({ title, rows, none }: { title: string; rows: [string, string][]; none: string }) {
  return (
    <div className="panel rounded-2xl p-5">
      <div className="font-semibold text-sm mb-3">{title}</div>
      {rows.length === 0 ? (
        <p className="text-[color:var(--ink)]/40 text-xs">{none}</p>
      ) : (
        <ul className="space-y-1.5 text-sm">
          {rows.map(([k, v]) => (
            <li key={k} className="flex justify-between">
              <span className="text-[color:var(--ink)]/60">{k}</span>
              <span className="font-semibold">{v}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
