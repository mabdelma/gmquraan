import { redirect } from "next/navigation";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { LeadRow } from "@/components/LeadRow";
import { getLocale } from "@/lib/i18n.server";
import { getAppMessages } from "@/lib/app-messages";
import { getLeadMessages } from "@/lib/lead-i18n";
import { getCentralMessages } from "@/lib/central-i18n";
import { getCentralPages } from "@/lib/central-pages-i18n";
import { translateBatch } from "@/lib/translate";

export const dynamic = "force-dynamic";

export default async function CentralLeadsPage() {
  const admin = await getCentralAdmin();
  if (!admin) redirect("/central");

  const locale = await getLocale();
  const t = getAppMessages(locale).partnerLeads;
  const lt = getLeadMessages(locale);
  const title = getCentralMessages(locale).nav.leads;
  const exportCsv = getCentralPages(locale).exportCsv;

  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    include: { solution: { select: { title: true } } }
  });
  // Show lead messages in the admin's selected language (cached, best-effort).
  const leadMsgs = await translateBatch(leads.map((l) => l.message ?? ""), locale);

  return (
    <section className="mx-auto max-w-5xl px-5 py-10">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-extrabold">{title}</h1>
        <a
          href="/api/central/export?type=leads"
          className="inline-flex items-center min-h-11 text-xs border border-[color:var(--hairline)] rounded-lg px-3 py-1.5 hover:bg-[color:var(--overlay)]"
        >
          {exportCsv}
        </a>
      </div>
      <p className="text-[color:var(--ink)]/50 mt-1 text-sm">{leads.length} {t.subtitle}</p>

      {leads.length === 0 ? (
        <p className="text-[color:var(--ink)]/55 text-sm panel rounded-2xl p-6 mt-8">{t.empty}</p>
      ) : (
        <div className="panel rounded-2xl p-6 mt-8 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs uppercase tracking-widest text-[color:var(--ink)]/55">
                <th className="pb-3 pr-4">{t.lead}</th>
                <th className="pb-3 pr-4">{t.solution}</th>
                <th className="pb-3 pr-4">{t.message}</th>
                <th className="pb-3">{t.status}</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l, i) => (
                <LeadRow
                  key={l.id}
                  id={l.id}
                  name={l.name}
                  email={l.email}
                  phone={l.phone}
                  company={l.company}
                  message={leadMsgs[i] || l.message}
                  notes={l.notes}
                  solutionTitle={l.solution?.title}
                  status={l.status}
                  createdAt={l.createdAt.toISOString()}
                  t={lt}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
