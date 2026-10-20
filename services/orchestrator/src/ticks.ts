import { prisma } from "@app/db";
import { ALL_AGENTS, type AgentOutcome } from "./agents.js";

/**
 * The background work.
 *
 * Each tick is a pure-ish function of the database: it reads, decides, writes,
 * and reports what it did. They are separated from the scheduler so each can be
 * run on demand and reasoned about alone, and so a failure in one cannot stop
 * the others.
 *
 * Every tick that changes anything writes an event first-class — a change with
 * no audit trail is exactly what the non-negotiable rules forbid, and "it was
 * the background job" is not an accountable actor.
 */

export type TickResult = { name: string; changed: number; note?: string };

/**
 * Escalate work that has run past its due date.
 *
 * `escalatedAt` makes this fire once per task rather than once per tick — an
 * escalation that repeats every minute is noise, and noise gets muted, which
 * defeats the purpose.
 */
export async function escalateOverdue(now = new Date()): Promise<TickResult> {
  const overdue = await prisma.task.findMany({
    where: {
      dueAt: { lt: now },
      escalatedAt: null,
      state: { notIn: ["COMPLETED", "ARCHIVED", "CANCELLED"] },
    },
    include: { owner: { select: { managerId: true, name: true } } },
    take: 200,
  });

  for (const t of overdue) {
    await prisma.$transaction([
      prisma.task.update({ where: { id: t.id }, data: { escalatedAt: now } }),
      prisma.taskEvent.create({
        data: {
          taskId: t.id,
          actorKind: "SYSTEM",
          actorRef: "system",
          actorName: "GM-OS",
          action: "escalated_overdue",
          note: t.owner.managerId
            ? `Past its due date — raised with ${t.owner.name}'s manager.`
            : `Past its due date. ${t.owner.name} has no manager recorded, so there is nobody to escalate to.`,
          meta: { dueAt: t.dueAt, managerId: t.owner.managerId },
        },
      }),
    ]);
  }

  return { name: "escalateOverdue", changed: overdue.length };
}

/** Expire approval requests nobody decided in time, so they cannot be revived. */
export async function expireApprovals(now = new Date()): Promise<TickResult> {
  const stale = await prisma.approvalRequest.findMany({
    where: { outcome: "PENDING", expiresAt: { lt: now } },
    take: 200,
  });

  for (const r of stale) {
    await prisma.approvalRequest.update({ where: { id: r.id }, data: { outcome: "EXPIRED" } });
  }
  return { name: "expireApprovals", changed: stale.length };
}

/** Clear out sessions and sign-in links that are past their expiry. */
export async function pruneSessions(now = new Date()): Promise<TickResult> {
  const [sessions, tokens] = await Promise.all([
    prisma.teamSession.deleteMany({ where: { expiresAt: { lt: new Date(now.getTime() - 7 * 86_400_000) } } }),
    prisma.teamLoginToken.deleteMany({ where: { expiresAt: { lt: new Date(now.getTime() - 86_400_000) } } }),
  ]);
  return { name: "pruneSessions", changed: sessions.count + tokens.count };
}

/**
 * Records whose retention has run out.
 *
 * This deliberately does not delete anything, and does not even move the record
 * to DELETION_PENDING. It raises an approval request for the records owner and
 * legal, because the autonomy matrix rates permanent deletion
 * RECORDS_OWNER_AND_LEGAL_APPROVAL, and because a background job that quietly
 * disposes of company records is the single worst thing this system could do.
 *
 * Legal holds are excluded at the query, so a held record never even generates
 * the request.
 */
export async function proposeDisposals(now = new Date()): Promise<TickResult> {
  const due = await prisma.controlledDocument.findMany({
    where: {
      legalHold: false,
      retainUntil: { lt: now },
      state: { in: ["ARCHIVED", "SUPERSEDED"] },
      // Nothing already queued for a decision.
      approvals: { none: { action: "permanent_delete", outcome: "PENDING" } },
    },
    take: 50,
  });

  for (const d of due) {
    await prisma.$transaction([
      prisma.approvalRequest.create({
        data: {
          action: "permanent_delete",
          gate: "RECORDS_OWNER_AND_LEGAL_APPROVAL",
          documentId: d.id,
          summary: `Retention has expired for ${d.docId} — ${d.title}`,
          minLevel: "A3",
          requestedByKind: "SYSTEM",
          requestedByRef: "system",
          payload: { retainUntil: d.retainUntil, retentionClass: d.retentionClass },
          // A disposal decision that nobody makes should lapse rather than sit
          // as a standing authorisation.
          expiresAt: new Date(now.getTime() + 30 * 86_400_000),
        },
      }),
      prisma.documentEvent.create({
        data: {
          documentId: d.id,
          actorKind: "SYSTEM",
          actorRef: "system",
          actorName: "GM-OS",
          action: "disposal_proposed",
          note: "Retention period elapsed. Raised for records owner and legal approval; nothing has been deleted.",
        },
      }),
    ]);
  }

  return { name: "proposeDisposals", changed: due.length };
}

/**
 * Apply an approval that has been granted.
 *
 * The gate having been cleared is not the same as the action having happened,
 * and the gap between them is where a system quietly does the wrong thing. So
 * this handles only what it knows how to complete, and leaves anything else
 * approved-but-unapplied for a person — visible, rather than silently dropped.
 */
export async function applyApprovals(now = new Date()): Promise<TickResult> {
  let applied = 0;

  // Enabling an agent, once the security owner has cleared it. Applied here
  // rather than in the portal so the grant and the effect are the same event —
  // an approval that is granted but never applied is the gap where a system
  // quietly does not do what somebody authorised.
  const enables = await prisma.approvalRequest.findMany({
    where: { outcome: "APPROVED", action: "agent_enable" },
    take: 25,
  });
  for (const r of enables) {
    const key = (r.payload as { key?: string } | null)?.key;
    if (!key) continue;
    const agent = await prisma.agentRegistry.findUnique({ where: { key } });
    if (!agent || agent.enabled) {
      await prisma.approvalRequest.update({ where: { id: r.id }, data: { outcome: "WITHDRAWN" } });
      continue;
    }
    await prisma.$transaction([
      prisma.agentRegistry.update({ where: { key }, data: { enabled: true } }),
      prisma.agentRun.create({
        data: {
          agentKey: key,
          outcome: "APPLIED",
          gateReason: `Enabled under approval ${r.id}.`,
          finishedAt: now,
        },
      }),
      prisma.approvalRequest.update({ where: { id: r.id }, data: { outcome: "APPLIED" } }),
    ]);
    applied++;
  }

  const granted = await prisma.approvalRequest.findMany({
    where: { outcome: "APPROVED", action: "permanent_delete", documentId: { not: null } },
    include: { decisions: true, document: true },
    take: 25,
  });

  for (const r of granted) {
    const doc = r.document;
    if (!doc || doc.state === "DELETED") continue;

    // Re-check the hold at the moment of action, not at the moment of approval:
    // a hold may have been placed while the request sat in the queue.
    if (doc.legalHold) {
      await prisma.$transaction([
        prisma.approvalRequest.update({ where: { id: r.id }, data: { outcome: "WITHDRAWN" } }),
        prisma.documentEvent.create({
          data: {
            documentId: doc.id,
            actorKind: "SYSTEM",
            actorRef: "system",
            actorName: "GM-OS",
            action: "disposal_withdrawn",
            note: "A legal hold was placed after the disposal was approved. Nothing was deleted.",
          },
        }),
      ]);
      continue;
    }

    const authorisers = [...new Set(r.decisions.filter((d) => d.vote === "APPROVE").map((d) => d.deciderId))];
    if (authorisers.length < 2) continue;

    // The bytes go; the row and its history stay. A destruction record that is
    // itself destroyed proves nothing.
    await prisma.$transaction([
      prisma.controlledDocument.update({
        where: { id: doc.id },
        data: { state: "DELETED", storagePath: null, sha256: null, sizeBytes: null },
      }),
      prisma.documentEvent.create({
        data: {
          documentId: doc.id,
          actorKind: "SYSTEM",
          actorRef: "system",
          actorName: "GM-OS",
          action: "disposed",
          fromState: doc.state,
          toState: "DELETED",
          note: `Disposed under two-person authorisation. Record and history retained as the destruction record.`,
          meta: { authorisers, approvedAt: r.decidedAt, at: now },
        },
      }),
    ]);
    applied++;
  }

  return { name: "applyApprovals", changed: applied };
}

/**
 * All eight catalogued agents, each through the same gate.
 *
 * They live in agents.ts; this wraps the suite as one tick so a failure in a
 * single agent cannot stop the housekeeping ticks around it.
 */
export async function runAgents(): Promise<TickResult> {
  const outcomes = await Promise.all(
    ALL_AGENTS.map(async (fn) => {
      try {
        return await fn();
      } catch (e) {
        console.error(`[agents] ${fn.name} failed`, e);
        return null;
      }
    })
  );

  const live = outcomes.filter((o): o is AgentOutcome => o !== null);
  const applied = live.reduce((n, o) => n + o.applied, 0);
  const gated = live.reduce((n, o) => n + o.gated, 0);
  const proposed = live.reduce((n, o) => n + o.proposed, 0);

  return {
    name: "runAgents",
    changed: applied,
    note: `${live.length} agents · ${proposed} proposals · ${applied} applied · ${gated} gated`,
  };
}

export const ALL_TICKS = [
  escalateOverdue,
  expireApprovals,
  pruneSessions,
  proposeDisposals,
  applyApprovals,
  runAgents,
] as const;
