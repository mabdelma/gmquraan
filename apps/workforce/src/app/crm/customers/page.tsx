import Link from "next/link";
import { requireMember } from "@/lib/guard";
import { visibleCustomers } from "@/lib/crm";
import { Shell } from "@/components/Shell";
import { roleCan } from "@app/core";

export const dynamic = "force-dynamic";

/**
 * The customer master.
 *
 * The create form doubles as the duplicate check: submitting once may come
 * back with candidates to review rather than a new record, which is the
 * canonical-customer rule working rather than an error.
 */
export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { member, viewer } = await requireMember();
  const sp = await searchParams;
  const customers = await visibleCustomers(viewer, 500);
  const mayCreate = roleCan(member.role, "create");

  const review = sp.review
    ? sp.review.split("~~").map((r) => {
        const [id, because] = r.split("|");
        return { id, because };
      })
    : [];

  return (
    <Shell member={member}>
      <nav className="mb-4 text-sm">
        <a href="/crm" className="[color:var(--accent-text)]">← Pipeline</a>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Customers</h1>
        <p className="mt-1 text-sm [color:var(--muted)]">
          One record per organisation. A matching tax identifier is the same legal entity, so a
          second record for it is refused rather than created.
        </p>
      </header>

      {sp.error && (
        <div role="alert" className="mb-6 rounded-2xl px-5 py-4 text-sm panel [color:var(--danger)]">
          {sp.error}
          {sp.existing && (
            <Link href={`/crm/customers/${sp.existing}`} className="ml-2 underline [color:var(--accent-text)]">
              Open the existing record
            </Link>
          )}
        </div>
      )}

      {review.length > 0 && (
        <section className="mb-6 rounded-2xl px-5 py-5 panel">
          <h2 className="text-sm font-bold [color:var(--warn)]">
            This may already exist
          </h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {review.map((r) => (
              <li key={r.id}>
                <Link href={`/crm/customers/${r.id}`} className="[color:var(--accent-text)]">
                  {r.because}
                </Link>
              </li>
            ))}
          </ul>
          <form action="/api/crm/customers" method="post" className="mt-4">
            {["displayName", "legalName", "taxId", "websiteDomain", "primaryEmail", "primaryPhone"].map((k) =>
              sp[k] ? <input key={k} type="hidden" name={k} value={sp[k]} /> : null
            )}
            <input type="hidden" name="confirmedDistinct" value="1" />
            <button className="rounded-xl border px-4 py-2.5 text-sm [border-color:var(--hairline)]">
              None of these — create it anyway
            </button>
          </form>
        </section>
      )}

      {mayCreate && (
        <details className="mb-8 rounded-2xl px-5 py-4 panel" open={review.length > 0}>
          <summary className="cursor-pointer text-sm font-semibold [color:var(--accent-text)]">Add a customer</summary>
          <form action="/api/crm/customers" method="post" className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field name="displayName" label="Name" required defaultValue={sp.displayName} />
            <Field name="legalName" label="Legal name" defaultValue={sp.legalName} />
            <Field name="taxId" label="Tax identifier" defaultValue={sp.taxId} />
            <Field name="websiteDomain" label="Website" defaultValue={sp.websiteDomain} />
            <Field name="primaryEmail" label="Email" defaultValue={sp.primaryEmail} />
            <Field name="primaryPhone" label="Phone" defaultValue={sp.primaryPhone} />
            <Field name="country" label="Country" />
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Type</span>
              <select name="customerType" defaultValue="ORGANIZATION"
                className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]">
                <option value="ORGANIZATION">Organisation</option>
                <option value="INDIVIDUAL">Individual</option>
              </select>
            </label>
            <button className="rounded-xl px-5 py-3 text-sm font-semibold [color:var(--on-accent)] [background:var(--accent)] sm:col-span-2 sm:justify-self-start">
              Check and create
            </button>
          </form>
        </details>
      )}

      {customers.length === 0 ? (
        <p className="rounded-2xl px-5 py-8 text-sm panel [color:var(--muted)]">No customers yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {customers.map((c) => (
            <li key={c.id}>
              <Link href={`/crm/customers/${c.id}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl px-5 py-4 panel hover:[background:var(--overlay)]">
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{c.displayName}</span>
                  <span className="block font-mono text-xs [color:var(--muted)]">{c.ref}</span>
                </span>
                <span className="flex shrink-0 flex-wrap gap-2 text-xs [color:var(--muted)]">
                  <span>{c._count.opportunities} opportunit{c._count.opportunities === 1 ? "y" : "ies"}</span>
                  <span className="rounded-full px-2.5 py-1 font-semibold [background:var(--overlay)]">
                    {c.status.toLowerCase().replace(/_/g, " ")}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}

function Field({ name, label, required, defaultValue }: { name: string; label: string; required?: boolean; defaultValue?: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <input name={name} required={required} defaultValue={defaultValue ?? ""} maxLength={200}
        className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]" />
    </label>
  );
}
