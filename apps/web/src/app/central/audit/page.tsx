import { redirect } from "next/navigation";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { getLocale } from "@/lib/i18n.server";
import { getCentralPages } from "@/lib/central-pages-i18n";

export const dynamic = "force-dynamic";

const COLORS: Record<string, string> = {
  create: "text-emerald-300",
  approve: "text-emerald-300",
  import: "text-emerald-300",
  update: "text-[color:var(--accent-text)]",
  reject: "text-red-300",
  delete: "text-red-300",
  record: "text-[color:var(--accent-text)]",
  password_change: "text-[color:var(--accent-text)]",
};
const tone = (action: string) => COLORS[action.split(".")[1]] ?? "text-[color:var(--ink)]/70";

export default async function CentralAuditPage() {
  const admin = await getCentralAdmin();
  if (!admin) redirect("/central");

  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 500 });
  const c = getCentralPages(await getLocale()).aud;

  return (
    <section className="mx-auto max-w-4xl px-5 py-10">
      <h1 className="text-2xl font-extrabold">{c.title}</h1>
      <p className="text-[color:var(--ink)]/50 mt-1 text-sm">{c.subtitle}</p>

      {logs.length === 0 ? (
        <p className="text-[color:var(--ink)]/55 text-sm panel rounded-2xl p-6 mt-8">{c.none}</p>
      ) : (
        <div className="panel rounded-2xl p-4 mt-8 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-widest text-[color:var(--ink)]/55">
                <th className="pb-3 pr-4">{c.when}</th>
                <th className="pb-3 pr-4">{c.admin}</th>
                <th className="pb-3 pr-4">{c.action}</th>
                <th className="pb-3 pr-4">{c.target}</th>
                <th className="pb-3">{c.detail}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-t border-[color:var(--hairline)]">
                  <td className="py-2.5 pr-4 text-[color:var(--ink)]/50 whitespace-nowrap">{l.createdAt.toLocaleString()}</td>
                  <td className="py-2.5 pr-4 text-[color:var(--ink)]/70">{l.actorEmail}</td>
                  <td className={`py-2.5 pr-4 font-mono text-xs ${tone(l.action)}`}>{l.action}</td>
                  <td className="py-2.5 pr-4">{l.target ?? "—"}</td>
                  <td className="py-2.5 text-[color:var(--ink)]/50">{l.detail ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
