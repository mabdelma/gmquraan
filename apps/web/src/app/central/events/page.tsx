import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";

export const dynamic = "force-dynamic";

export default async function CentralEventsPage() {
  const admin = await getCentralAdmin();
  if (!admin) redirect("/central");

  const [events, byType] = await Promise.all([
    prisma.domainEvent.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.domainEvent.groupBy({ by: ["type"], _count: { type: true }, orderBy: { _count: { type: "desc" } } }),
  ]);

  return (
    <section className="mx-auto max-w-3xl px-5 py-10">
      <Link href="/central" className="text-sm text-[color:var(--ink)]/50 hover:text-[color:var(--ink)]">← Console</Link>
      <h1 className="text-2xl font-extrabold mt-3">Event stream</h1>
      <p className="text-[color:var(--ink)]/50 mt-1 text-sm">Append-only domain-event log — the foundation async consumers read from.</p>

      {byType.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-6">
          {byType.map((b) => (
            <span key={b.type} className="text-xs panel rounded-full px-3 py-1.5">
              <span className="font-mono text-[color:var(--accent-text)]/90">{b.type}</span> <span className="text-[color:var(--ink)]/50">{b._count.type}</span>
            </span>
          ))}
        </div>
      )}

      <div className="mt-8 space-y-2">
        {events.length === 0 ? (
          <p className="text-[color:var(--ink)]/55 text-sm panel rounded-2xl p-6">No events yet — they'll appear as things happen (signups, publishes, payouts, demos, accepted quotes).</p>
        ) : (
          events.map((e) => (
            <div key={e.id} className="panel rounded-lg px-4 py-2.5 text-sm flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="font-mono text-[color:var(--accent-text)]/90">{e.type}</span>
                {e.payload != null && (
                  <span className="text-[color:var(--ink)]/45 text-xs ml-2 break-all">{JSON.stringify(e.payload)}</span>
                )}
              </div>
              <span className="text-[color:var(--ink)]/40 text-xs whitespace-nowrap">{new Date(e.createdAt).toLocaleString()}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
