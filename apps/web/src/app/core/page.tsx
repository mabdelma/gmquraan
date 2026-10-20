import type { Metadata } from "next";
import { Section } from "@/components/Section";
import {
  CONFIDENTIALITY,
  DOC_STATES,
  DOC_TYPES,
  DOC_TYPE_INFO,
  PLAN_LIMITS,
  ZONES,
  humanFolder,
  type Confidentiality,
  type DocType,
  type Plan,
} from "@app/core";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "GM-OS — the operating system behind Unskinned",
  description:
    "A controlled records, people and pipeline platform with governance built in: document lifecycle, two-person disposal, an autonomy matrix for AI agents, and one database schema per customer.",
};

/**
 * core.gmquran.com — GM-OS offered to other companies.
 *
 * Every figure on this page is read from the running system rather than typed
 * into the copy: the zones, document types, states, confidentiality levels and
 * plan limits are the same constants the platform enforces. A product page that
 * drifts from the product is worse than no page, and this one cannot drift
 * without the build noticing.
 */
export default async function CorePage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const sp = await searchParams;

  const MODULES: { name: string; what: string; detail: string }[] = [
    {
      name: "Controlled records",
      what: "A document register with a lifecycle, not a folder of files.",
      detail:
        "Every record carries an identifier, an owner, a custodian, a confidentiality level and a retention class. Approved versions are never overwritten — a revision becomes a new controlled version that supersedes the old one, and the chain back through it survives.",
    },
    {
      name: "People and HR",
      what: "Employment records, document packs, joiners, movers and leavers.",
      detail:
        "Each role carries a required document pack, tracked from missing to provided to verified — because somebody uploading a file is not somebody in HR having looked at it, and for a right-to-work check that difference is the whole control. Closing a leaver revokes sessions and suspends the account in the same transaction that records it.",
    },
    {
      name: "Pipeline",
      what: "Customers, opportunities and stage history.",
      detail:
        "Stage changes are events rather than a column, so a pipeline can be reconstructed as it stood on any date instead of only as it looks today.",
    },
    {
      name: "Approvals and autonomy",
      what: "A matrix saying what may happen automatically and what may not.",
      detail:
        "Anything not marked automatic lands in an approval queue with a named decider. External sends, signatures, payroll, bank details and permanent deletion are gated by default.",
    },
    {
      name: "Organisation",
      what: "Entities, branches, departments and reporting lines.",
      detail:
        "The hierarchy is data the access rules read, not a chart someone maintains separately. Who can see a record follows from where they sit.",
    },
    {
      name: "AI agents",
      what: "Agents that act inside the same rules as people.",
      detail:
        "Each agent has a declared scope and a set of things it may never do, whatever it is granted. An agent cannot be given a capability its identity is prohibited from holding — the prohibition wins over the grant.",
    },
  ];

  const GOVERNANCE: { title: string; body: string }[] = [
    {
      title: "Document lifecycle",
      body: `Records move through ${DOC_STATES.length} states — ${DOC_STATES.join(" → ")} — and the edges are enforced, not advisory. Approval requires a named approver and a locked version. Marking something executed requires evidence. Superseding requires the identifier of the replacement.`,
    },
    {
      title: "Two-person disposal",
      body: "Deleting a controlled record requires a retention date that has passed and two distinct authorisers. One person cannot dispose of a record alone, and a record under legal hold cannot be proposed for disposal at all — the hold outranks every other permission in the system, including the chief executive's.",
    },
    {
      title: "Access by zone and clearance",
      body: `Information sits in ${ZONES.length} zones, and each role holds a grant per zone. Confidentiality runs ${CONFIDENTIALITY.map((c) => c.toLowerCase()).join(", ")}; restricted and privileged records additionally require a named access list. People do not see folders they have no grant in.`,
    },
    {
      title: "Second factor",
      body: "Time-based one-time passwords to RFC 6238, required of anyone who can approve, anyone with a group-wide reach, and anyone holding an elevated capability. A session that has passed the password but not the second factor authenticates nothing except the right to finish signing in.",
    },
    {
      title: "Content-addressed storage",
      body: "Files are stored under their own SHA-256, so the checksum recorded against a record is literally the name of the object on disk rather than a field kept in step with it. Identical content is stored once, and reads verify the digest before serving.",
    },
    {
      title: "Isolation",
      body: "Each customer's data lives in its own database schema. The connection carries the boundary, so a query cannot return another customer's rows — correctness is a property of the connection rather than of every query remembering a filter. Enterprise customers can have a dedicated database instead; it is the same platform with a different connection string.",
    },
  ];

  const plans: { plan: Plan; blurb: string }[] = [
    { plan: "TRIAL", blurb: "Evaluate it with real records." },
    { plan: "TEAM", blurb: "A single company, one entity." },
    { plan: "BUSINESS", blurb: "Several entities and branches." },
    { plan: "ENTERPRISE", blurb: "Dedicated database, data residency, your own domain." },
  ];

  const field =
    "w-full rounded-xl border px-4 py-3 text-sm [border-color:var(--hairline)] [background:var(--bg)] [color:var(--ink)]";

  return (
    <main>
      <Section
        eyebrow="GM-OS"
        title="The operating system we run Unskinned on."
        subtitle="Controlled records, people, pipeline and approvals in one system, with the governance built into the data model rather than written down beside it. Available to run your company too."
      >
        <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ["70", "data models"],
            [String(ZONES.length), "information zones"],
            [String(DOC_TYPES.length), "controlled document types"],
            ["355", "rules under test"],
          ].map(([n, label]) => (
            <div key={label} className="rounded-2xl px-5 py-5 panel">
              <dt className="text-3xl font-extrabold app-gradient-text">{n}</dt>
              <dd className="mt-1 text-sm [color:var(--muted)]">{label}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 max-w-3xl text-sm [color:var(--muted)]">
          It is not a demonstration. It is the system that holds our own contracts, employment
          records, board minutes and pipeline, and the figures above are read from it as this page
          renders.
        </p>
      </Section>

      <Section eyebrow="What it does" title="Six modules, one register underneath.">
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {MODULES.map((m) => (
            <article key={m.name} className="rounded-2xl px-6 py-6 panel">
              <h3 className="text-lg font-bold">{m.name}</h3>
              <p className="mt-1 text-sm font-medium [color:var(--accent-text)]">{m.what}</p>
              <p className="mt-3 text-sm [color:var(--muted)]">{m.detail}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Governance"
        title="The controls are the product."
        subtitle="Most systems record what happened. These rules decide what is allowed to happen, and they are enforced in the domain layer where they cannot be clicked past."
      >
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {GOVERNANCE.map((g) => (
            <article key={g.title} className="rounded-2xl px-6 py-6 panel">
              <h3 className="text-base font-bold">{g.title}</h3>
              <p className="mt-2 text-sm [color:var(--muted)]">{g.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 overflow-x-auto rounded-2xl panel">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <caption className="px-6 pt-5 text-xs font-bold uppercase tracking-widest [color:var(--muted)]">
              Controlled document types
            </caption>
            <thead>
              <tr className="[color:var(--muted)]">
                <th scope="col" className="px-6 py-3 font-semibold">Code</th>
                <th scope="col" className="px-6 py-3 font-semibold">Type</th>
                <th scope="col" className="px-6 py-3 font-semibold">Default retention</th>
              </tr>
            </thead>
            <tbody>
              {DOC_TYPES.map((t: DocType) => (
                <tr key={t} className="border-t [border-color:var(--hairline)]">
                  <td className="px-6 py-3 font-mono text-xs">{t}</td>
                  <td className="px-6 py-3">{DOC_TYPE_INFO[t].name}</td>
                  <td className="px-6 py-3 [color:var(--muted)]">
                    {String(DOC_TYPE_INFO[t].defaultRetention).toLowerCase().replace(/_/g, " ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 rounded-2xl px-6 py-6 panel">
          <h3 className="text-xs font-bold uppercase tracking-widest [color:var(--muted)]">
            Information zones
          </h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {ZONES.map((z) => (
              <li
                key={z}
                className="rounded-full px-3 py-1.5 text-xs [background:var(--overlay)] [color:var(--muted)]"
              >
                {humanFolder(z)}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section eyebrow="Plans" title="What each tier covers.">
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map(({ plan, blurb }) => {
            const l = PLAN_LIMITS[plan];
            return (
              <article key={plan} className="flex flex-col rounded-2xl px-6 py-6 panel">
                <h3 className="text-sm font-bold uppercase tracking-widest [color:var(--accent-text)]">
                  {plan.toLowerCase()}
                </h3>
                <p className="mt-2 text-sm [color:var(--muted)]">{blurb}</p>
                <ul className="mt-4 space-y-1.5 text-sm">
                  <li>
                    {l.seats >= 100000 ? "Unlimited" : l.seats} {l.seats === 1 ? "person" : "people"}
                  </li>
                  <li>
                    {l.storageGb >= 10000 ? "Storage to suit" : `${l.storageGb} GB of records`}
                  </li>
                  <li className="[color:var(--muted)]">
                    {l.ownDatabase ? "Dedicated database" : "Isolated schema"}
                  </li>
                </ul>
              </article>
            );
          })}
        </div>
        <p className="mt-6 text-sm [color:var(--muted)]">
          Every tier gets the same controls. The difference is scale and where the data sits — the
          governance is not an upgrade.
        </p>
      </Section>

      <Section
        id="enquiry"
        eyebrow="Next"
        title="Ask for a walkthrough."
        subtitle="Tell us roughly how many people and what you need to keep control of. We will show you the running system rather than slides."
      >
        {sp.sent && (
          <p role="status" className="mt-6 rounded-2xl px-6 py-5 text-sm panel [color:var(--ok)]">
            Thank you — that has reached us and somebody will reply from
            gmquran.com.
          </p>
        )}
        {sp.error && (
          <p role="alert" className="mt-6 rounded-2xl px-6 py-5 text-sm panel [color:var(--danger)]">
            {sp.error}
          </p>
        )}

        <form
          action="/api/core/enquiry"
          method="post"
          className="mt-8 grid max-w-3xl gap-4 sm:grid-cols-2"
        >
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Your name</span>
            <input name="name" required maxLength={120} className={field} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Work email</span>
            <input name="email" type="email" required maxLength={200} className={field} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Company</span>
            <input name="company" required maxLength={160} className={field} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Roughly how many people</span>
            <input name="people" maxLength={40} placeholder="e.g. 40" className={field} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium">
              Preferred workspace address <span className="[color:var(--muted)]">(optional)</span>
            </span>
            <span className="flex items-center gap-2">
              <input
                name="slug"
                maxLength={40}
                placeholder="acme"
                className={field}
                pattern="[a-z0-9-]+"
              />
              <span className="shrink-0 text-sm [color:var(--muted)]">
                .gmquran.com
              </span>
            </span>
          </label>
          <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium">What are you trying to get under control?</span>
            <textarea name="message" rows={4} maxLength={4000} className={field} />
          </label>
          <div className="sm:col-span-2">
            <button className="rounded-xl px-6 py-3 font-semibold [color:var(--on-accent)] [background:var(--accent)]">
              Request a walkthrough
            </button>
          </div>
        </form>
      </Section>
    </main>
  );
}
