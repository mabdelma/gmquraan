import { prisma } from "@app/db";
import { requireMember } from "@/lib/guard";
import { Shell } from "@/components/Shell";
import {
  APPROVAL_LIMITS,
  CARD_FIELDS,
  DEPARTMENTS,
  ENTITIES,
  STATUTORY_ANNUAL_LEAVE_DAYS,
  elevatedOperations,
  requiredDocumentsForRole,
  leaveRemaining,
  type EntityId,
} from "@app/core";

export const dynamic = "force-dynamic";

type Phone = { key?: string; label?: string; value?: string; href?: string };

/**
 * The personal account.
 *
 * Four sections, and the divisions between them are the access policy made
 * visible rather than a layout choice:
 *
 *   Business card   — published on the public site and in a downloadable
 *                     vCard. Read-only; a correction goes to HR.
 *   Employment      — set by HR. Read-only.
 *   Your details    — emergency contact and personal numbers. The employee's
 *                     to maintain, because HR needs them from the employee.
 *   Access          — role, level, clearance. Read-only, and not negotiable
 *                     through this page.
 */
export default async function MePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; requested?: string }>;
}) {
  const { member } = await requireMember();
  const sp = await searchParams;

  const [full, manager, sessions, balance, training, pendingCard] = await Promise.all([
    prisma.teamMember.findUnique({
      where: { id: member.id },
      include: { person: true, employeeRecord: true, position: true, packItems: true },
    }),
    member.managerId
      ? prisma.teamMember.findUnique({ where: { id: member.managerId }, select: { name: true } })
      : null,
    prisma.teamSession.findMany({
      where: { memberId: member.id, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.leaveBalance.findFirst({
      where: { memberId: member.id, year: new Date().getFullYear(), type: "ANNUAL" },
    }),
    prisma.trainingRecord.findMany({
      where: { memberId: member.id },
      orderBy: [{ status: "asc" }, { expiresAt: "asc" }],
    }),
    prisma.cardChangeRequest.findMany({
      where: { requesterId: member.id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // An elevation is shown to the person who holds it. A privilege somebody
  // does not know they have is one they cannot be accountable for.
  const elevated = full
    ? elevatedOperations({ role: full.role as never, grantedCapabilities: full.grantedCapabilities })
    : [];
  const grantReason = (full?.grantedCapabilities as { reason?: string } | null)?.reason ?? "";

  // The pack, so somebody can actually supply what is being asked of them.
  const record = full?.employeeRecord ?? null;
  const requiredDocs = requiredDocumentsForRole(
    (full?.role ?? member.role) as never,
    record?.employmentType ?? "FULL_TIME"
  );
  const held = new Map((full?.packItems ?? []).map((i) => [i.code, i]));

  const card = full?.person ?? null;
  const rec = full?.employeeRecord ?? null;
  const phones: Phone[] = Array.isArray(card?.phones) ? (card!.phones as Phone[]) : [];
  const branches: string[] = Array.isArray(card?.branchSlugs) ? (card!.branchSlugs as string[]) : [];

  const pendingDays = 0; // requested-but-undecided is summarised on /leave
  const remaining = balance ? leaveRemaining({ ...balance, pendingDays }) : null;

  return (
    <Shell member={member}>
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">My profile</h1>
        <p className="mt-1 text-sm [color:var(--muted)]">
          Your business card, your employment record, and the details we need from you.
        </p>
      </header>

      {sp.saved && <Note tone="ok">Saved.</Note>}
      {sp.requested && <Note tone="ok">Sent to HR. They will action or decline it and you will see the result here.</Note>}
      {sp.error && <Note tone="danger">{sp.error}</Note>}

      {/* ── Business card ─────────────────────────────────────────────── */}
      <section className="mb-8 rounded-2xl px-5 py-5 panel">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
            Business card
          </h2>
          <span className="rounded-full px-2.5 py-1 text-xs font-semibold [background:var(--overlay)]">
            read-only
          </span>
        </div>
        <p className="mb-4 text-sm [color:var(--muted)]">
          These appear on the public website and on the vCard anyone can download, so they are
          maintained by HR rather than edited here. Ask for a correction below if anything is wrong.
        </p>

        {!card ? (
          <p className="text-sm [color:var(--muted)]">No business card is linked to your account.</p>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-4">
              <Avatar name={card.name} photo={card.photo} />
              <div className="min-w-0">
                <div className="truncate text-lg font-bold">{card.name}</div>
                <div className="truncate text-sm [color:var(--muted)]">
                  {member.title || "No job title recorded"}
                </div>
              </div>
            </div>

            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="Work email" value={card.email} mono />
              <Field label="Location" value={card.location} />
              <Field
                label="LinkedIn"
                value={card.linkedin || "—"}
                href={card.linkedin || undefined}
              />
              <Field label="WhatsApp" value={card.whatsappDisplay || "—"} />
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-wide [color:var(--muted)]">Phone numbers</dt>
                <dd className="mt-1 flex flex-col gap-1 text-sm">
                  {phones.length === 0 && <span className="[color:var(--muted)]">—</span>}
                  {phones.map((p, i) => (
                    <span key={i}>
                      <span className="font-mono">{p.value}</span>
                      {(p.label || p.key) && (
                        <span className="[color:var(--muted)]"> — {p.label || p.key}</span>
                      )}
                    </span>
                  ))}
                </dd>
              </div>
              <Field
                label="Branches on the card"
                value={branches.length ? branches.join(", ") : "None assigned"}
              />
              <Field
                label="Card files"
                value={[card.vcfPath && "vCard", card.qrPath && "QR code"].filter(Boolean).join(" · ") || "Generated on demand"}
              />
            </dl>
          </>
        )}

        {pendingCard.length > 0 && (
          <div className="mt-5 rounded-xl px-4 py-3 text-sm [background:var(--overlay)]">
            <span className="font-semibold">{pendingCard.length} correction(s) awaiting HR:</span>{" "}
            {pendingCard.map((r) => r.field).join(", ")}
          </div>
        )}

        <details className="mt-5">
          <summary className="cursor-pointer text-sm font-semibold [color:var(--accent-text)]">
            Request a correction
          </summary>
          <form action="/api/me/card-request" method="post" className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Field</span>
              <select
                name="field"
                required
                className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]"
              >
                {CARD_FIELDS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Should be</span>
              <input
                name="proposed"
                required
                maxLength={300}
                className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
              <span className="font-medium">Why (optional)</span>
              <input
                name="reason"
                maxLength={300}
                className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]"
              />
            </label>
            <button className="rounded-xl px-5 py-3 text-sm font-semibold [color:var(--on-accent)] [background:var(--accent)] sm:col-span-2 sm:justify-self-start">
              Send to HR
            </button>
          </form>
        </details>
      </section>

      {/* ── Employment ────────────────────────────────────────────────── */}
      <section className="mb-8 rounded-2xl px-5 py-5 panel">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
            Employment
          </h2>
          <span className="rounded-full px-2.5 py-1 text-xs font-semibold [background:var(--overlay)]">
            set by HR
          </span>
        </div>
        <dl className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field label="Status" value={rec?.status ?? "No record yet"} />
          <Field label="Employment type" value={rec?.employmentType.replace(/_/g, " ") ?? "—"} />
          <Field label="Employee number" value={rec?.employeeNo ?? "Not issued"} />
          <Field label="Start date" value={rec?.startDate ? rec.startDate.toISOString().slice(0, 10) : "Not recorded"} />
          <Field
            label="Employing entity"
            value={
              rec?.contractEntityId
                ? `${rec.contractEntityId} — ${ENTITIES[rec.contractEntityId as EntityId]?.legalName ?? ""}`
                : "—"
            }
          />
          <Field label="Seat" value={full?.position?.title ?? "No seat assigned"} />
          <Field label="Reports to" value={manager?.name ?? "—"} />
          <Field
            label="Annual leave"
            value={
              balance
                ? `${remaining} of ${balance.entitledDays} days remaining`
                : "No balance opened"
            }
          />
        </dl>
        {balance && member.entityId && (
          <p className="mt-3 text-xs [color:var(--muted)]">
            Opened at the statutory minimum for {member.entityId} (
            {STATUTORY_ANNUAL_LEAVE_DAYS[member.entityId as EntityId]} days). Your contract may
            provide more — HR sets the actual figure.
          </p>
        )}
      </section>

      {/* ── Documents we need from you ─────────────────────────────────── */}
      <section className="mb-8 rounded-2xl px-5 py-5 panel">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
          Documents we need from you
        </h2>
        <p className="mb-4 text-sm [color:var(--muted)]">
          Uploading marks an item as supplied. People verify it separately — that second step is
          the point of the check, so nothing counts as done until they have looked at it.
        </p>

        <ul className="flex flex-col gap-2">
          {requiredDocs.map((r) => {
            const item = held.get(r.code);
            const status = item?.status ?? "MISSING";
            const done = status === "VERIFIED" || status === "WAIVED";
            return (
              <li key={r.code} className="rounded-xl px-4 py-3 [background:var(--overlay)]">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium">
                    {r.name}
                    {!r.mandatory && <span className="[color:var(--muted)]"> · optional</span>}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      done
                        ? "[color:var(--ok)]"
                        : status === "PROVIDED"
                          ? "[color:var(--warn)]"
                          : "[color:var(--muted)]"
                    }`}
                  >
                    {status === "PROVIDED" ? "awaiting verification" : status.toLowerCase()}
                  </span>
                </div>
                {r.note && <p className="mt-1 text-xs [color:var(--muted)]">{r.note}</p>}
                {!done && (
                  <form
                    action={`/api/me/pack/${r.code}`}
                    method="post"
                    encType="multipart/form-data"
                    className="mt-2 flex flex-wrap items-center gap-2"
                  >
                    <input
                      name="file"
                      type="file"
                      required
                      className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-xs [border-color:var(--hairline)] [background:var(--bg)]"
                    />
                    <button className="rounded-lg px-4 py-2 text-xs font-semibold [color:var(--on-accent)] [background:var(--accent)]">
                      {status === "PROVIDED" ? "Replace" : "Upload"}
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── The employee's own details ────────────────────────────────── */}
      <section className="mb-8 rounded-2xl px-5 py-5 panel">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
          Your details
        </h2>
        <p className="mb-4 text-sm [color:var(--muted)]">
          These are yours to keep current. The emergency contact is the one we would actually use.
        </p>

        <form action="/api/me" method="post" className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Personal email</span>
            <input
              name="personalEmail"
              type="email"
              defaultValue={rec?.personalEmail ?? ""}
              className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Personal phone</span>
            <input
              name="personalPhone"
              defaultValue={rec?.personalPhone ?? ""}
              className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Emergency contact</span>
            <input
              name="emergencyContactName"
              defaultValue={rec?.emergencyContactName ?? ""}
              className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Their phone</span>
            <input
              name="emergencyContactPhone"
              defaultValue={rec?.emergencyContactPhone ?? ""}
              className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Relationship</span>
            <input
              name="emergencyContactRelation"
              defaultValue={rec?.emergencyContactRelation ?? ""}
              className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Interface language</span>
            <select
              name="locale"
              defaultValue={member.locale ?? "en"}
              className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="ar">العربية</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium">Dietary or accessibility needs (optional)</span>
            <input
              name="dietaryNotes"
              defaultValue={rec?.dietaryNotes ?? ""}
              maxLength={300}
              placeholder="Anything we should know when arranging travel, events or equipment"
              className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]"
            />
          </label>

          <button className="rounded-xl px-5 py-3 font-semibold [color:var(--on-accent)] [background:var(--accent)] sm:col-span-2 sm:justify-self-start">
            Save my details
          </button>
        </form>
      </section>

      {/* ── Training ───────────────────────────────────────────────────── */}
      <section className="mb-8 rounded-2xl px-5 py-5 panel">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
          Training and certification
        </h2>
        <p className="mb-4 text-sm [color:var(--muted)]">
          Record a certificate with its expiry, so it can be noticed before it lapses rather than
          after somebody relied on it.
        </p>

        {training.length > 0 && (
          <ul className="mb-4 flex flex-col gap-2">
            {training.map((t) => {
              const expired = t.expiresAt && t.expiresAt < new Date();
              return (
                <li key={t.id} className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl px-4 py-3 text-sm [background:var(--overlay)]">
                  <span>
                    <span className="font-medium">{t.title}</span>
                    {t.provider && <span className="[color:var(--muted)]"> · {t.provider}</span>}
                    {t.mandatory && <span className="[color:var(--warn)]"> · required</span>}
                  </span>
                  <span className={`text-xs ${expired ? "[color:var(--danger)]" : "[color:var(--muted)]"}`}>
                    {t.status.toLowerCase()}
                    {t.expiresAt ? ` · ${expired ? "expired" : "expires"} ${t.expiresAt.toISOString().slice(0, 10)}` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <form action="/api/hr/training" method="post" className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium">Title</span>
            <input name="title" required maxLength={200}
              className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Provider</span>
            <input name="provider" maxLength={200}
              className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Kind</span>
            <select name="kind" defaultValue="COURSE"
              className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]">
              <option value="COURSE">course</option>
              <option value="CERTIFICATION">certification</option>
              <option value="INDUCTION">induction</option>
              <option value="POLICY_ACK">policy acknowledgement</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Status</span>
            <select name="status" defaultValue="COMPLETED"
              className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]">
              <option value="PLANNED">planned</option>
              <option value="IN_PROGRESS">in progress</option>
              <option value="COMPLETED">completed</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Expires (if it does)</span>
            <input name="expiresAt" type="date"
              className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]" />
          </label>
          <button className="rounded-xl px-5 py-3 text-sm font-semibold [color:var(--on-accent)] [background:var(--accent)] sm:col-span-2 sm:justify-self-start">
            Add
          </button>
        </form>
      </section>

      {/* ── Access ────────────────────────────────────────────────────── */}
      <section className="mb-8 rounded-2xl px-5 py-5 panel">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
          Access
        </h2>
        <p className="mb-4 text-sm [color:var(--muted)]">
          What you can see and approve. Changing any of it is an access decision, so it is not
          something this page can do.
        </p>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Field label="Role" value={member.role.replace(/_/g, " ")} />
          <Field
            label="Approval level"
            value={`${member.approvalLevel} — ${APPROVAL_LIMITS[member.approvalLevel].description}`}
          />
          <Field label="Clearance" value={member.clearance} />
          <Field
            label="Capabilities beyond your role"
            value={
              elevated.length
                ? `${elevated.join(", ")} — ${grantReason}`
                : "None"
            }
            wide
          />
          <Field
            label="Department"
            value={
              member.departmentId
                ? `${member.departmentId} — ${DEPARTMENTS[member.departmentId as keyof typeof DEPARTMENTS]?.name ?? ""}`
                : "—"
            }
          />
        </dl>
      </section>

      <section className="rounded-2xl px-5 py-5 panel">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
          Where you are signed in
        </h2>
        <ul className="mb-4 mt-3 flex flex-col gap-2 text-sm">
          {sessions.map((s) => (
            <li key={s.id} className="flex flex-wrap justify-between gap-2 rounded-xl px-4 py-3 [background:var(--overlay)]">
              <span className="[color:var(--muted)]">
                {s.method === "mailbox" ? "Password" : "Email link"} · {s.ip ?? "unknown address"}
              </span>
              <time dateTime={s.createdAt.toISOString()} className="[color:var(--muted)]">
                {s.createdAt.toISOString().replace("T", " ").slice(0, 16)}
              </time>
            </li>
          ))}
        </ul>
        <form action="/api/me/sessions" method="post">
          <button className="rounded-xl border px-5 py-3 text-sm [border-color:var(--hairline)]">
            Sign out everywhere
          </button>
        </form>
      </section>
    </Shell>
  );
}

function Note({ tone, children }: { tone: "ok" | "danger"; children: React.ReactNode }) {
  return (
    <p
      role={tone === "danger" ? "alert" : "status"}
      className={`mb-6 rounded-2xl px-5 py-4 text-sm panel ${tone === "ok" ? "[color:var(--ok)]" : "[color:var(--danger)]"}`}
    >
      {children}
    </p>
  );
}

function Field({
  label,
  value,
  mono,
  href,
  wide,
}: {
  label: string;
  value: string;
  mono?: boolean;
  href?: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-xs uppercase tracking-wide [color:var(--muted)]">{label}</dt>
      <dd className={`mt-1 break-words text-sm ${mono ? "font-mono" : ""}`}>
        {href ? (
          <a href={href} className="[color:var(--accent-text)]" rel="noreferrer noopener" target="_blank">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function Avatar({ name, photo }: { name: string; photo: string | null }) {
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover" />;
  }
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span
      aria-hidden="true"
      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-lg font-bold [background:var(--surface)] [color:var(--accent-text)]"
    >
      {initials}
    </span>
  );
}
