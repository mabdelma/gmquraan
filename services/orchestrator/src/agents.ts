import { prisma } from "@app/db";
import {
  buildReport,
  complianceFlags,
  decide,
  documentMetadataIssues,
  findDuplicates,
  proposeConfidentiality,
  proposeDepartment,
  qualityIssues,
  routeDocument,
  type Gate,
  type TaskState,
} from "@app/core";

/**
 * The eight agents from the catalogue, wired up.
 *
 * They all go through `run()`. That is the point: one place consults the
 * autonomy matrix, one place records the AgentRun, one place decides whether a
 * proposal is applied or queued. An agent that talked to the database directly
 * would be an agent whose gate somebody could forget to check.
 */

export type AgentOutcome = { agent: string; proposed: number; applied: number; gated: number };

type Proposal = {
  /** Autonomy-matrix action key. */
  action: string;
  taskId?: string;
  documentId?: string;
  confidence?: number;
  summary: string;
  payload: Record<string, unknown>;
  /** Runs only when the gate is cleared. */
  apply: () => Promise<void>;
};

/**
 * Put a proposal through the gate.
 *
 * Every path writes an AgentRun, including the refusals. The management report
 * computes the override rate from these rows, and a run that only recorded its
 * successes would make every agent look good.
 */
async function run(
  agentKey: string,
  agent: { maxGate: string; enabled: boolean; autoFileConfidence: number; humanReviewConfidence: number },
  p: Proposal
): Promise<"APPLIED" | "GATED" | "REFUSED" | "FAILED"> {
  const verdict = decide(p.action, {
    maxGate: agent.maxGate as Gate,
    enabled: agent.enabled,
    confidence: p.confidence,
    autoFileConfidence: agent.autoFileConfidence,
    humanReviewConfidence: agent.humanReviewConfidence,
  });

  if (verdict.verdict !== "PROCEED") {
    const reason = "reason" in verdict ? verdict.reason : "Refused.";
    await prisma.agentRun.create({
      data: {
        agentKey,
        taskId: p.taskId ?? null,
        documentId: p.documentId ?? null,
        outcome: verdict.verdict === "GATED" ? "GATED" : "REJECTED",
        confidence: p.confidence ?? null,
        gateReason: reason,
        // Nothing was written, so the run is a dry one by definition.
        dryRun: true,
        input: p.payload as never,
        output: { summary: p.summary } as never,
        finishedAt: new Date(),
      },
    });

    // A gated proposal that lands nowhere is a proposal nobody sees. Anything
    // needing a human decision is queued as one.
    if (verdict.verdict === "GATED" && verdict.gate !== "AUTO" && verdict.gate !== "AUTO_WITH_AUDIT") {
      const already = await prisma.approvalRequest.findFirst({
        where: {
          action: p.action,
          outcome: "PENDING",
          taskId: p.taskId ?? undefined,
          documentId: p.documentId ?? undefined,
        },
      });
      if (!already) {
        await prisma.approvalRequest.create({
          data: {
            action: p.action,
            gate: verdict.gate,
            taskId: p.taskId ?? null,
            documentId: p.documentId ?? null,
            summary: p.summary,
            minLevel: verdict.minLevel,
            requestedByKind: "AGENT",
            requestedByRef: agentKey,
            payload: { ...p.payload, reason } as never,
            expiresAt: new Date(Date.now() + 14 * 86_400_000),
          },
        });
      }
    }
    return verdict.verdict === "GATED" ? "GATED" : "REFUSED";
  }

  try {
    await p.apply();
    await prisma.agentRun.create({
      data: {
        agentKey,
        taskId: p.taskId ?? null,
        documentId: p.documentId ?? null,
        outcome: "APPLIED",
        confidence: p.confidence ?? null,
        input: p.payload as never,
        output: { summary: p.summary } as never,
        finishedAt: new Date(),
      },
    });
    return "APPLIED";
  } catch (e) {
    await prisma.agentRun.create({
      data: {
        agentKey,
        taskId: p.taskId ?? null,
        documentId: p.documentId ?? null,
        outcome: "FAILED",
        error: (e as Error).message,
        input: p.payload as never,
        finishedAt: new Date(),
      },
    });
    return "FAILED";
  }
}

async function registry(key: string) {
  return prisma.agentRegistry.findUnique({ where: { key } });
}

const tally = (agent: string, results: string[]): AgentOutcome => ({
  agent,
  proposed: results.length,
  applied: results.filter((r) => r === "APPLIED").length,
  gated: results.filter((r) => r === "GATED" || r === "REFUSED").length,
});

/** Record an observation against a task without changing its state. */
async function note(taskId: string, agentKey: string, name: string, text: string) {
  await prisma.taskEvent.create({
    data: {
      taskId,
      actorKind: "AGENT",
      actorRef: agentKey,
      actorName: name,
      action: "observation",
      note: text,
    },
  });
}

// ── AI-ORCH ────────────────────────────────────────────────────────────────

/** Triage: propose a department and a classification for captured work. */
export async function orchestrationAgent(): Promise<AgentOutcome | null> {
  const a = await registry("AI-ORCH");
  if (!a) return null;

  const tasks = await prisma.task.findMany({
    where: { state: "NEW" },
    take: 25,
  });

  const results: string[] = [];
  for (const t of tasks) {
    const dept = proposeDepartment({ title: t.title, description: t.description });
    const conf = proposeConfidentiality({ title: t.title, description: t.description });

    // Nothing to say. Recording a run for every no-op would drown the log the
    // override rate is computed from.
    if (!dept.value && conf.value === (t.confidentiality as string)) continue;

    results.push(
      await run("AI-ORCH", a, {
        action: "classify_and_tag",
        taskId: t.id,
        // The weaker of the two drives the gate: a confident classification
        // must not carry an uncertain department through with it.
        confidence: Math.min(dept.value ? dept.confidence : 1, conf.confidence),
        summary: `Triage ${t.ref}: ${dept.value ? `department ${dept.value}, ` : ""}classification ${conf.value}`,
        payload: { department: dept, confidentiality: conf },
        apply: async () => {
          await prisma.task.update({
            where: { id: t.id },
            data: {
              departmentId: t.departmentId ?? dept.value,
              confidentiality: conf.value,
              state: "TRIAGED",
              aiConfidence: conf.confidence,
            },
          });
          await prisma.taskEvent.create({
            data: {
              taskId: t.id,
              actorKind: "AGENT",
              actorRef: "AI-ORCH",
              actorName: a.name,
              action: "triaged",
              fromState: "NEW",
              toState: "TRIAGED",
              note: `${dept.reason} ${conf.reason}`,
            },
          });
        },
      })
    );
  }
  return tally("AI-ORCH", results);
}

// ── AI-DOC ─────────────────────────────────────────────────────────────────

/** Metadata validation and filing destination for controlled documents. */
export async function documentAgent(): Promise<AgentOutcome | null> {
  const a = await registry("AI-DOC");
  if (!a) return null;

  const docs = await prisma.controlledDocument.findMany({
    where: { state: { in: ["DRAFT", "IN_REVIEW"] } },
    take: 25,
  });

  const results: string[] = [];
  for (const d of docs) {
    const issues = documentMetadataIssues({
      docId: d.docId,
      title: d.title,
      entityId: d.entityId,
      departmentId: d.departmentId,
      docType: d.docType,
      year: d.year,
      sequence: d.sequence,
      shortTitle: d.shortTitle,
      ownerId: d.ownerId,
      retentionClass: d.retentionClass,
      confidentiality: d.confidentiality,
    });
    if (issues.length === 0) continue;

    const routing = routeDocument({ docType: d.docType, aiConfidence: d.aiConfidence ?? 1 });

    results.push(
      await run("AI-DOC", a, {
        action: "classify_and_tag",
        documentId: d.id,
        confidence: d.aiConfidence ?? 1,
        summary: `${d.docId}: ${issues.length} metadata issue(s); belongs in ${routing.destination}`,
        payload: { issues, routing },
        apply: async () => {
          await prisma.documentEvent.create({
            data: {
              documentId: d.id,
              actorKind: "AGENT",
              actorRef: "AI-DOC",
              actorName: a.name,
              action: "metadata_reviewed",
              note: `${issues.join(" ")} Destination: ${routing.destination}.`,
              meta: { issues, routing } as never,
            },
          });
        },
      })
    );
  }
  return tally("AI-DOC", results);
}

// ── AI-SCHED ───────────────────────────────────────────────────────────────

/**
 * Assign triaged work.
 *
 * Prefers somebody in the task's own department and entity with the lightest
 * open load, and falls back to the owner when nobody fits. Load-balancing on
 * open task count is crude, but it beats always picking the same person.
 */
export async function schedulingAgent(): Promise<AgentOutcome | null> {
  const a = await registry("AI-SCHED");
  if (!a) return null;

  const tasks = await prisma.task.findMany({
    where: { state: "TRIAGED", assigneeId: null, agentKey: null },
    take: 25,
  });
  if (tasks.length === 0) return tally("AI-SCHED", []);

  const results: string[] = [];
  for (const t of tasks) {
    const candidates = await prisma.teamMember.findMany({
      where: {
        status: "ACTIVE",
        ...(t.entityId ? { entityId: t.entityId } : {}),
        ...(t.departmentId ? { departmentId: t.departmentId } : {}),
      },
      select: { id: true, name: true },
    });

    let chosen = t.ownerId;
    let why = "Nobody matched the department, so it stays with the owner.";

    if (candidates.length > 0) {
      const loads = await Promise.all(
        candidates.map(async (c) => ({
          c,
          open: await prisma.task.count({
            where: { assigneeId: c.id, state: { notIn: ["COMPLETED", "ARCHIVED", "CANCELLED"] } },
          }),
        }))
      );
      loads.sort((x, y) => x.open - y.open);
      chosen = loads[0].c.id;
      why = `${loads[0].c.name} has the lightest open load (${loads[0].open}).`;
    }

    results.push(
      await run("AI-SCHED", a, {
        action: "assign_routine_task",
        taskId: t.id,
        summary: `Assign ${t.ref} — ${why}`,
        payload: { assigneeId: chosen, why },
        apply: async () => {
          await prisma.task.update({ where: { id: t.id }, data: { assigneeId: chosen, state: "ASSIGNED" } });
          await prisma.taskEvent.create({
            data: {
              taskId: t.id,
              actorKind: "AGENT",
              actorRef: "AI-SCHED",
              actorName: a.name,
              action: "assigned",
              fromState: "TRIAGED",
              toState: "ASSIGNED",
              note: why,
            },
          });
        },
      })
    );
  }
  return tally("AI-SCHED", results);
}

// ── AI-QA ──────────────────────────────────────────────────────────────────

/** Check work that claims to be finished against its own acceptance criteria. */
export async function qualityAgent(): Promise<AgentOutcome | null> {
  const a = await registry("AI-QA");
  if (!a) return null;

  const tasks = await prisma.task.findMany({ where: { state: "REVIEW" }, take: 25 });

  const results: string[] = [];
  for (const t of tasks) {
    const issues = qualityIssues({
      state: t.state as TaskState,
      acceptanceCriteria: t.acceptanceCriteria,
      expectedOutputs: t.expectedOutputs,
      evidence: t.evidence,
    });
    if (issues.length === 0) continue;

    results.push(
      await run("AI-QA", a, {
        action: "classify_and_tag",
        taskId: t.id,
        summary: `${t.ref} is in review but ${issues.length} check(s) fail`,
        payload: { issues },
        // Only ever writes an observation. Sending work back is a judgement
        // about somebody's output, and that stays with their reviewer.
        apply: async () => note(t.id, "AI-QA", a.name, `Quality check: ${issues.join(" ")}`),
      })
    );
  }
  return tally("AI-QA", results);
}

// ── AI-COMP ────────────────────────────────────────────────────────────────

/** Screen for policy, privacy and approval problems. */
export async function complianceAgent(): Promise<AgentOutcome | null> {
  const a = await registry("AI-COMP");
  if (!a) return null;

  const tasks = await prisma.task.findMany({
    where: { state: { notIn: ["ARCHIVED", "CANCELLED"] } },
    take: 50,
  });

  const results: string[] = [];
  for (const t of tasks) {
    const flags = complianceFlags({
      title: t.title,
      description: t.description,
      confidentiality: t.confidentiality,
      departmentId: t.departmentId,
      // Access lists are not modelled on tasks yet, so a restricted task counts
      // as having nobody named on it — which is the honest reading.
      accessListSize: 0,
    });
    if (flags.length === 0) continue;

    results.push(
      await run("AI-COMP", a, {
        action: "classify_and_tag",
        taskId: t.id,
        summary: `${t.ref}: ${flags[0]}`,
        payload: { flags },
        apply: async () => note(t.id, "AI-COMP", a.name, `Compliance: ${flags.join(" ")}`),
      })
    );
  }
  return tally("AI-COMP", results);
}

// ── AI-KNOW ────────────────────────────────────────────────────────────────

/** Find duplicate records before they become two versions of the truth. */
export async function knowledgeAgent(): Promise<AgentOutcome | null> {
  const a = await registry("AI-KNOW");
  if (!a) return null;

  const docs = await prisma.controlledDocument.findMany({
    where: { state: { notIn: ["DELETED", "ARCHIVED"] } },
    select: { id: true, docId: true, title: true, sha256: true },
    take: 500,
  });

  const found = findDuplicates(docs.map((d) => ({ id: d.id, title: d.title, sha256: d.sha256 })));
  const byId = new Map(docs.map((d) => [d.id, d]));

  const results: string[] = [];
  for (const f of found.slice(0, 25)) {
    const a1 = byId.get(f.aId);
    const b1 = byId.get(f.bId);
    if (!a1 || !b1) continue;

    results.push(
      await run("AI-KNOW", a, {
        action: "classify_and_tag",
        documentId: a1.id,
        confidence: f.confidence,
        summary: `${a1.docId} and ${b1.docId} look like duplicates (${f.kind})`,
        payload: { ...f, aDocId: a1.docId, bDocId: b1.docId },
        apply: async () => {
          await prisma.documentEvent.create({
            data: {
              documentId: a1.id,
              actorKind: "AGENT",
              actorRef: "AI-KNOW",
              actorName: a.name,
              action: "duplicate_suspected",
              note: `${f.reason} Other record: ${b1.docId}.`,
              meta: f as never,
            },
          });
        },
      })
    );
  }
  return tally("AI-KNOW", results);
}

// ── AI-REP ─────────────────────────────────────────────────────────────────

/**
 * The management picture.
 *
 * Runs on a schedule rather than per record, and writes an announcement the
 * executives actually see. A dashboard nobody opens is not reporting.
 */
export async function reportingAgent(force = false): Promise<AgentOutcome | null> {
  const a = await registry("AI-REP");
  if (!a) return null;

  const now = new Date();
  if (!force) {
    const last = await prisma.agentRun.findFirst({
      where: { agentKey: "AI-REP", outcome: "APPLIED" },
      orderBy: { startedAt: "desc" },
    });
    // Daily. More often than that and it stops being read.
    if (last && now.getTime() - last.startedAt.getTime() < 23 * 3600_000) {
      return tally("AI-REP", []);
    }
  }

  const [tasksOpen, tasksOverdue, tasksBlocked, approvalsPending, approvalsOverdue, docsUnclassified, docsMissingRetention, runs, seatsTotal, seatsFilled] =
    await Promise.all([
      prisma.task.count({ where: { state: { notIn: ["COMPLETED", "ARCHIVED", "CANCELLED"] } } }),
      prisma.task.count({
        where: { dueAt: { lt: now }, state: { notIn: ["COMPLETED", "ARCHIVED", "CANCELLED"] } },
      }),
      prisma.task.count({ where: { state: "BLOCKED" } }),
      prisma.approvalRequest.count({ where: { outcome: "PENDING" } }),
      prisma.approvalRequest.count({ where: { outcome: "PENDING", expiresAt: { lt: now } } }),
      prisma.controlledDocument.count({ where: { confidentiality: undefined } }),
      prisma.controlledDocument.count({ where: { retentionClass: "" } }),
      prisma.agentRun.findMany({
        where: { startedAt: { gt: new Date(now.getTime() - 7 * 86_400_000) } },
        select: { outcome: true },
      }),
      prisma.orgPosition.count(),
      prisma.teamMember.count({ where: { positionId: { not: null } } }),
    ]);

  const report = buildReport({
    tasksOpen,
    tasksOverdue,
    tasksBlocked,
    approvalsPending,
    approvalsOverdue,
    docsUnclassified,
    docsMissingRetention,
    agentRuns: runs,
    seatsTotal,
    seatsFilled,
  });

  const ceo = await prisma.teamMember.findFirst({ where: { role: "CEO" }, select: { id: true } });

  const result = await run("AI-REP", a, {
    action: "classify_and_tag",
    summary: report.headline,
    payload: report as never,
    apply: async () => {
      if (!ceo) return; // nobody to attribute it to
      await prisma.announcement.create({
        data: {
          title: `GM-OS status — ${now.toISOString().slice(0, 10)}`,
          body:
            report.headline +
            (report.exceptions.length ? `\n\nExceptions:\n• ${report.exceptions.join("\n• ")}` : ""),
          audience: "ALL",
          authorId: ceo.id,
          expiresAt: new Date(now.getTime() + 7 * 86_400_000),
        },
      });
    },
  });

  return tally("AI-REP", [result]);
}

// ── AI-REC ─────────────────────────────────────────────────────────────────

/**
 * Records housekeeping: archive finished work, flag records with no retention
 * class. Disposal itself stays in the orchestrator's own tick, behind the
 * two-person gate.
 */
export async function recordsAgent(): Promise<AgentOutcome | null> {
  const a = await registry("AI-REC");
  if (!a) return null;

  const cutoff = new Date(Date.now() - 30 * 86_400_000);
  const stale = await prisma.task.findMany({
    where: { state: "COMPLETED", completedAt: { lt: cutoff } },
    take: 25,
  });

  const results: string[] = [];
  for (const t of stale) {
    results.push(
      await run("AI-REC", a, {
        action: "move_approved_record",
        taskId: t.id,
        summary: `Archive ${t.ref}, completed over 30 days ago`,
        payload: { completedAt: t.completedAt },
        apply: async () => {
          await prisma.task.update({ where: { id: t.id }, data: { state: "ARCHIVED" } });
          await prisma.taskEvent.create({
            data: {
              taskId: t.id,
              actorKind: "AGENT",
              actorRef: "AI-REC",
              actorName: a.name,
              action: "archived",
              fromState: "COMPLETED",
              toState: "ARCHIVED",
              note: "Completed more than 30 days ago.",
            },
          });
        },
      })
    );
  }
  return tally("AI-REC", results);
}

export const ALL_AGENTS = [
  orchestrationAgent,
  documentAgent,
  schedulingAgent,
  qualityAgent,
  complianceAgent,
  knowledgeAgent,
  recordsAgent,
  reportingAgent,
] as const;
