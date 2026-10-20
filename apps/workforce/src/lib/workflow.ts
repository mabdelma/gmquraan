import { prisma } from "@app/db";
import { recordAudit } from "./audit";
import {
  applyDecision,
  decisionProblem,
  stageOf,
  type Decision,
  type Instance,
  type WorkflowDefinition,
  type WorkflowStage,
} from "@app/core";

/**
 * Running workflows (WF-01).
 *
 * The engine in `@app/core` is pure and knows nothing about people or storage.
 * This is the part that does: it loads a definition, resolves who is eligible
 * for a stage against the directory, persists decisions and writes the audit.
 *
 * The split is the point. Every rule worth arguing about — a requester cannot
 * approve their own request, a quorum counts distinct people, a rejection ends
 * the run — is tested without a database, and this layer cannot quietly
 * disagree with it because it does not re-implement any of it.
 */

const asDefinition = (row: {
  code: string;
  version: number;
  name: string;
  trigger: string;
  subjectType: string;
  stages: unknown;
  onApproved: string;
  onRejected: string;
}): WorkflowDefinition => ({
  code: row.code,
  version: row.version,
  name: row.name,
  trigger: row.trigger,
  subjectType: row.subjectType,
  stages: (row.stages ?? []) as WorkflowStage[],
  onApproved: row.onApproved,
  onRejected: row.onRejected,
});

/** The live definition for a code, or null. */
export async function liveDefinition(code: string) {
  const row = await prisma.workflowDefinition.findFirst({
    where: { code, active: true },
    orderBy: { version: "desc" },
  });
  return row ? { row, definition: asDefinition(row) } : null;
}

/**
 * Start a run.
 *
 * Returns the existing run when one is already open for the same subject.
 * Starting a second approval chain for one thing is how two people end up
 * approving different halves of the same request.
 */
export async function startWorkflow(input: {
  code: string;
  subjectType: string;
  subjectRef: string;
  requestedById: string;
  requestedByName?: string | null;
  subjectMemberId?: string | null;
  companyId?: string | null;
  evidence?: string[];
}) {
  const live = await liveDefinition(input.code);
  if (!live) return { ok: false as const, error: `No live workflow named ${input.code}.` };

  const open = await prisma.workflowInstance.findFirst({
    where: { subjectType: input.subjectType, subjectRef: input.subjectRef, state: "RUNNING" },
  });
  if (open) return { ok: true as const, instance: open, alreadyRunning: true };

  const first = live.definition.stages[0];
  const instance = await prisma.workflowInstance.create({
    data: {
      definitionId: live.row.id,
      definitionCode: live.definition.code,
      version: live.definition.version,
      subjectType: input.subjectType,
      subjectRef: input.subjectRef,
      companyId: input.companyId ?? null,
      requestedById: input.requestedById,
      subjectMemberId: input.subjectMemberId ?? null,
      currentStageKey: first.key,
      state: "RUNNING",
      evidence: (input.evidence ?? []) as never,
    },
  });

  await recordAudit({
    action: "wf.instance.start",
    actorKind: "HUMAN",
    actorId: input.requestedById,
    actorName: input.requestedByName ?? null,
    entityType: input.subjectType,
    entityRef: input.subjectRef,
    companyId: input.companyId ?? null,
    after: { workflow: live.definition.code, version: live.definition.version, stage: first.key },
    note: `${live.definition.name} started.`,
  });

  return { ok: true as const, instance, alreadyRunning: false };
}

/**
 * Who may decide a stage.
 *
 * Resolved against the directory here rather than in the engine. `NAMED` and
 * `MIN_LEVEL` are answered from the member row; `DEPARTMENT` and `ROLE` from
 * their placement; `MANAGER_OF_SUBJECT` from the subject's manager — which is
 * why the instance carries the subject at all.
 */
export async function eligibleFor(
  stage: WorkflowStage,
  instance: { subjectMemberId?: string | null }
): Promise<Set<string>> {
  const targets = Array.isArray(stage.target) ? stage.target : stage.target ? [stage.target] : [];

  if (stage.rule === "NAMED") return new Set(targets);

  if (stage.rule === "MANAGER_OF_SUBJECT") {
    if (!instance.subjectMemberId) return new Set();
    const subject = await prisma.teamMember.findUnique({
      where: { id: instance.subjectMemberId },
      select: { managerId: true },
    });
    return new Set(subject?.managerId ? [subject.managerId] : []);
  }

  const where =
    stage.rule === "ROLE"
      ? { role: { in: targets }, status: "ACTIVE" }
      : stage.rule === "DEPARTMENT"
        ? { departmentId: { in: targets }, status: "ACTIVE" }
        : { approvalLevel: { in: targets }, status: "ACTIVE" };

  const rows = await prisma.teamMember.findMany({ where: where as never, select: { id: true } });
  return new Set(rows.map((r) => r.id));
}

const toInstance = (row: {
  definitionCode: string;
  version: number;
  subjectRef: string;
  requestedById: string;
  subjectMemberId: string | null;
  currentStageKey: string;
  state: string;
  startedAt: Date;
  stageEnteredAt: Date;
  evidence: unknown;
}, decisions: Decision[]): Instance => ({
  definitionCode: row.definitionCode,
  version: row.version,
  subjectRef: row.subjectRef,
  requestedById: row.requestedById,
  subjectMemberId: row.subjectMemberId,
  currentStageKey: row.currentStageKey,
  state: row.state as Instance["state"],
  startedAt: row.startedAt,
  stageEnteredAt: row.stageEnteredAt,
  decisions,
  evidence: (row.evidence ?? []) as string[],
});

/**
 * Record one decision and advance.
 *
 * The whole thing is one transaction. A decision that lands without the
 * instance moving — or an instance that advances without the decision that
 * moved it — is a two-person control with a hole in it.
 */
export async function decide(input: {
  instanceId: string;
  deciderId: string;
  deciderName?: string | null;
  outcome: "APPROVE" | "REJECT";
  note?: string | null;
  onBehalfOf?: string | null;
}) {
  const row = await prisma.workflowInstance.findUnique({
    where: { id: input.instanceId },
    include: { decisions: true, definition: true },
  });
  if (!row) return { ok: false as const, error: "That request no longer exists." };

  const definition = asDefinition(row.definition);
  const instance = toInstance(
    row,
    row.decisions.map((d) => ({
      stageKey: d.stageKey,
      deciderId: d.deciderId,
      outcome: d.outcome as "APPROVE" | "REJECT",
      at: d.at,
      onBehalfOf: d.onBehalfOf,
    }))
  );

  const stage = stageOf(definition, row.currentStageKey);
  if (!stage) return { ok: false as const, error: "This request is at a stage the workflow no longer defines." };

  const eligible = await eligibleFor(stage, row);
  const problem = decisionProblem(
    definition,
    instance,
    { id: input.deciderId },
    (_s, memberId) => eligible.has(memberId)
  );
  if (problem) return { ok: false as const, error: problem };

  const decision: Decision = {
    stageKey: stage.key,
    deciderId: input.deciderId,
    outcome: input.outcome,
    at: new Date(),
    onBehalfOf: input.onBehalfOf ?? null,
  };
  const next = applyDecision(definition, instance, decision);
  const moved = next.currentStageKey !== row.currentStageKey;

  await prisma.$transaction([
    prisma.workflowDecision.create({
      data: {
        instanceId: row.id,
        stageKey: stage.key,
        deciderId: input.deciderId,
        outcome: input.outcome,
        note: input.note ?? null,
        onBehalfOf: input.onBehalfOf ?? null,
      },
    }),
    prisma.workflowInstance.update({
      where: { id: row.id },
      data: {
        state: next.state,
        currentStageKey: next.currentStageKey,
        // Only when the stage actually changed, or the SLA clock restarts on
        // every partial decision and a stalled stage looks fresh.
        ...(moved ? { stageEnteredAt: new Date() } : {}),
        ...(next.state === "RUNNING" ? {} : { finishedAt: new Date() }),
      },
    }),
  ]);

  await recordAudit({
    action: input.outcome === "APPROVE" ? "wf.stage.approve" : "wf.stage.reject",
    actorKind: "HUMAN",
    actorId: input.deciderId,
    actorName: input.deciderName ?? null,
    entityType: row.subjectType,
    entityRef: row.subjectRef,
    companyId: row.companyId,
    before: { stage: row.currentStageKey, state: row.state },
    after: { stage: next.currentStageKey, state: next.state },
    note: input.onBehalfOf ? `Decided on behalf of ${input.onBehalfOf}.` : (input.note ?? null),
  });

  return { ok: true as const, state: next.state, stage: next.currentStageKey };
}

/** Runs waiting on this person, across everything. */
export async function waitingOn(memberId: string, companyIds: readonly string[] | undefined) {
  const running = await prisma.workflowInstance.findMany({
    where: { state: "RUNNING" },
    include: { definition: true, decisions: true },
    orderBy: { stageEnteredAt: "asc" },
    take: 200,
  });

  const mine = [];
  for (const row of running) {
    // Company scope first, before anything about this run is revealed.
    if (row.companyId) {
      if (!companyIds || !companyIds.includes(row.companyId)) continue;
    }
    const definition = asDefinition(row.definition);
    const stage = stageOf(definition, row.currentStageKey);
    if (!stage) continue;

    const eligible = await eligibleFor(stage, row);
    if (!eligible.has(memberId)) continue;
    if (row.requestedById === memberId || row.subjectMemberId === memberId) continue;
    if (row.decisions.some((d) => d.stageKey === stage.key && d.deciderId === memberId)) continue;

    mine.push({ row, definition, stage });
  }
  return mine;
}
