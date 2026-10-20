import { redirect } from "next/navigation";
import { prisma } from "@app/db";
import { requireMember } from "@/lib/guard";
import { Shell } from "@/components/Shell";
import { canReadAudit, isGroupWide } from "@app/core";

export const dynamic = "force-dynamic";

/**
 * The audit trail (AUD-01).
 *
 * Filtered per row through `canReadAudit` rather than in the query. The rules
 * live in one tested place, and a `where` clause that approximates them is how
 * a leak happens — the same reason `visibleDocuments` filters per row.
 *
 * `SCOPING_RULES.md` is explicit that reports obey the same scope as
 * transactional APIs, and a log is a report. Without that, this page is how you
 * learn what happens inside a company you have no access to.
 */
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; ref?: string; corr?: string }>;
}) {
  const { member, viewer } = await requireMember();
  if (!isGroupWide(member.role)) redirect("/home");
  const sp = await searchParams;

  // Over-fetch, then filter per row. The take is generous enough that scope
  // filtering rarely empties the page, and the count of what was withheld is
  // shown rather than hidden.
  const rows = await prisma.auditEvent.findMany({
    where: {
      ...(sp.action ? { action: { startsWith: sp.action } } : {}),
      ...(sp.ref ? { entityRef: sp.ref } : {}),
      ...(sp.corr ? { correlationId: sp.corr } : {}),
    },
    orderBy: { at: "desc" },
    take: 300,
  });

  const visible = rows.filter((r) => canReadAudit(viewer, r));
  const withheld = rows.length - visible.length;

  const chip = "rounded-full px-2.5 py-1 text-xs font-semibold [background:var(--overlay)]";

  return (
    <Shell member={member}>
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Audit trail</h1>
        <p className="mt-2 max-w-3xl text-sm [color:var(--muted)]">
          Every audited action across the system. Secrets are never written here; monetary values are
          recorded as changed without the figure.
        </p>
        {(sp.action || sp.ref || sp.corr) && (
          <p className="mt-3 text-sm">
            <a href="/admin/audit" className="[color:var(--accent-text)]">
              Clear filter
            </a>
          </p>
        )}
      </header>

      {withheld > 0 && (
        <p className="mb-4 rounded-2xl px-5 py-4 text-sm panel [color:var(--muted)]">
          {withheld} {withheld === 1 ? "entry is" : "entries are"} outside your company scope and not
          shown.
        </p>
      )}

      {visible.length === 0 ? (
        <p className="rounded-2xl px-5 py-8 text-sm panel [color:var(--muted)]">
          Nothing recorded yet that you can see.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((r) => {
            const before = (r.beforeJson ?? null) as Record<string, unknown> | null;
            const after = (r.afterJson ?? null) as Record<string, unknown> | null;
            const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])];

            return (
              <li key={r.id} className="rounded-2xl px-5 py-4 panel">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <a
                    href={`/admin/audit?action=${encodeURIComponent(r.action)}`}
                    className="font-mono text-sm font-semibold [color:var(--accent-text)]"
                  >
                    {r.action}
                  </a>
                  <span className="text-sm">{r.actorName || r.actorId}</span>
                  <span className={chip}>{r.actorKind.toLowerCase()}</span>
                  <a
                    href={`/admin/audit?ref=${encodeURIComponent(r.entityRef)}`}
                    className="text-xs [color:var(--muted)]"
                  >
                    {r.entityType}/{r.entityRef}
                  </a>
                  {r.companyId && <span className={chip}>{r.companyId}</span>}
                  <span className="ms-auto text-xs [color:var(--muted)]">
                    {r.at.toISOString().replace("T", " ").slice(0, 19)}
                  </span>
                </div>

                {r.note && <p className="mt-2 text-sm [color:var(--muted)]">{r.note}</p>}

                {keys.length > 0 && (
                  <table className="mt-3 w-full text-left text-xs">
                    <thead className="[color:var(--muted)]">
                      <tr>
                        <th className="py-1 pe-4 font-semibold">Field</th>
                        <th className="py-1 pe-4 font-semibold">Before</th>
                        <th className="py-1 font-semibold">After</th>
                      </tr>
                    </thead>
                    <tbody>
                      {keys.map((k) => (
                        <tr key={k} className="border-t [border-color:var(--hairline)]">
                          <td className="py-1 pe-4 font-mono">{k}</td>
                          <td className="py-1 pe-4 [color:var(--muted)]">
                            {before && k in before ? String(before[k]) : "—"}
                          </td>
                          <td className="py-1">{after && k in after ? String(after[k]) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {r.correlationId && (
                  <p className="mt-2 text-xs [color:var(--muted)]">
                    <a href={`/admin/audit?corr=${encodeURIComponent(r.correlationId)}`}>
                      everything in this request
                    </a>
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Shell>
  );
}
