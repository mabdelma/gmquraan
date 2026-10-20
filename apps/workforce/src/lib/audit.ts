import { randomUUID } from "crypto";
import { headers } from "next/headers";
import { prisma } from "@app/db";
import { auditEntryProblem, changedFields, redactForAudit, type AuditEntry } from "@app/core";

/**
 * Writing the cross-cutting audit record (AUD-01).
 *
 * One helper rather than a call to `prisma.auditEvent.create` at each site, so
 * that redaction, validation and the correlation id cannot be forgotten in one
 * route and remembered in the next.
 */

/**
 * The id shared by every row written while serving one request.
 *
 * Taken from an inbound `x-correlation-id` when a caller supplies one — that is
 * how a request traced from another service stays one story — and generated
 * otherwise.
 */
export async function correlationId(): Promise<string> {
  const h = await headers();
  return h.get("x-correlation-id") || h.get("x-request-id") || randomUUID();
}

type RecordInput = Omit<AuditEntry, "before" | "after" | "correlationId"> & {
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
};

/**
 * Record one audited action.
 *
 * Deliberately does not throw. An audit write failing must not be the reason a
 * legitimate business action fails — that turns a logging fault into an outage,
 * and users then learn to retry, which produces the duplicate the action was
 * careful to avoid. A failure is reported to the server log instead, where it
 * is a monitoring problem rather than a user-facing one.
 *
 * The tradeoff is stated rather than hidden: this makes audit best-effort at
 * the write. For actions where the audit is the control itself — a two-person
 * disposal, a payroll lock — write the record inside the same transaction as
 * the change instead of calling this.
 */
export async function recordAudit(input: RecordInput): Promise<void> {
  const diff = changedFields(input.before, input.after);

  const entry: AuditEntry = {
    ...input,
    correlationId: await correlationId().catch(() => null),
    before: diff.keys.length ? diff.before : null,
    after: diff.keys.length ? diff.after : null,
  };

  const problem = auditEntryProblem(entry);
  if (problem) {
    // A malformed entry is a programming error. Say so loudly in the log and
    // still write what we can, because losing the record of a real action is
    // worse than storing an imperfectly named one.
    console.error(`[audit] ${problem} — action=${entry.action} actor=${entry.actorId}`);
  }

  try {
    const h = await headers();
    await prisma.auditEvent.create({
      data: {
        action: entry.action,
        actorKind: entry.actorKind,
        actorId: entry.actorId,
        actorName: entry.actorName ?? null,
        entityType: entry.entityType,
        entityRef: entry.entityRef,
        companyId: entry.companyId ?? null,
        correlationId: entry.correlationId ?? null,
        beforeJson: (entry.before ?? undefined) as never,
        afterJson: (entry.after ?? undefined) as never,
        note: entry.note ?? null,
        // Trusted only as a hint. Behind a proxy this is whatever the proxy
        // says, and it is recorded for correlation, never for authorization.
        ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
        userAgent: h.get("user-agent")?.slice(0, 300) || null,
      },
    });
  } catch (e) {
    console.error("[audit] write failed:", e instanceof Error ? e.message : e);
  }
}

/**
 * Build the audit payload for a transactional write.
 *
 * For the cases where the audit belongs inside the same transaction as the
 * change, this produces the `data` object without performing the write, so the
 * caller can hand it to `prisma.$transaction`.
 */
export function auditData(input: RecordInput & { correlationId?: string | null }) {
  const diff = changedFields(input.before, input.after);
  return {
    action: input.action,
    actorKind: input.actorKind,
    actorId: input.actorId,
    actorName: input.actorName ?? null,
    entityType: input.entityType,
    entityRef: input.entityRef,
    companyId: input.companyId ?? null,
    correlationId: input.correlationId ?? null,
    beforeJson: (diff.keys.length ? diff.before : undefined) as never,
    afterJson: (diff.keys.length ? diff.after : undefined) as never,
    note: input.note ?? null,
  };
}

/** Redact an arbitrary value for a note or meta field. */
export const forAudit = redactForAudit;
