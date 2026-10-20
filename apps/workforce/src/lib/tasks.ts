import { prisma } from "@app/db";
import {
  canRead,
  canWrite,
  isGroupWide,
  taskTransitionProblem,
  type TaskState,
  type Viewer,
} from "@app/core";

/**
 * Task reads and writes, with the access rules applied at the query where
 * possible and re-checked per row afterwards.
 *
 * Both, deliberately. The query keeps the result set small; the per-row check
 * is what actually enforces the policy, because a `where` clause is easy to get
 * subtly wrong and impossible to unit-test against the real rules.
 */

/** The tasks a viewer is entitled to see, newest first. */
export async function visibleTasks(v: Viewer, opts: { open?: boolean; limit?: number } = {}) {
  const scope = isGroupWide(v.role)
    ? {}
    : {
        OR: [
          { ownerId: v.id },
          { assigneeId: v.id },
          { requesterId: v.id },
          ...(v.reportIds?.length
            ? [{ ownerId: { in: v.reportIds } }, { assigneeId: { in: v.reportIds } }]
            : []),
          ...(v.role === "MANAGER" && v.entityId ? [{ entityId: v.entityId }] : []),
        ],
      };

  const openOnly = opts.open
    ? { state: { notIn: ["COMPLETED", "ARCHIVED", "CANCELLED"] as TaskState[] } }
    : {};

  const rows = await prisma.task.findMany({
    where: { ...scope, ...openOnly },
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    take: opts.limit ?? 100,
    include: {
      owner: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
    },
  });

  return rows.filter((t) =>
    canRead(v, {
      ownerId: t.ownerId,
      assigneeId: t.assigneeId,
      requesterId: t.requesterId,
      entityId: t.entityId,
      departmentId: t.departmentId,
      confidentiality: t.confidentiality,
    })
  );
}

export async function readableTask(v: Viewer, id: string) {
  const t = await prisma.task.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
      requester: { select: { id: true, name: true } },
      events: { orderBy: { at: "desc" }, take: 50 },
    },
  });
  if (!t) return null;
  const allowed = canRead(v, {
    ownerId: t.ownerId,
    assigneeId: t.assigneeId,
    requesterId: t.requesterId,
    entityId: t.entityId,
    departmentId: t.departmentId,
    confidentiality: t.confidentiality,
  });
  return allowed ? t : null;
}

/**
 * Move a task, or explain why not.
 *
 * The transition and its audit event are written in one transaction: a state
 * change with no event would be a change nobody can account for, which the
 * non-negotiable rules forbid.
 */
export async function moveTask(
  v: Viewer,
  taskId: string,
  to: TaskState,
  actorName: string,
  note?: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const t = await prisma.task.findUnique({ where: { id: taskId } });
  if (!t) return { ok: false, message: "That task no longer exists." };

  const record = {
    ownerId: t.ownerId,
    assigneeId: t.assigneeId,
    requesterId: t.requesterId,
    entityId: t.entityId,
    departmentId: t.departmentId,
    confidentiality: t.confidentiality,
  };
  if (!canRead(v, record)) return { ok: false, message: "That task no longer exists." };
  if (!canWrite(v, record)) return { ok: false, message: "You cannot change this task." };

  const problem = taskTransitionProblem(t.state as TaskState, to, {
    ownerId: t.ownerId,
    dueAt: t.dueAt,
    priority: t.priority,
    inputs: t.inputs,
    expectedOutputs: t.expectedOutputs,
    acceptanceCriteria: t.acceptanceCriteria,
    destination: t.destination,
  });
  if (problem) return { ok: false, message: problem };

  const now = new Date();
  await prisma.$transaction([
    prisma.task.update({
      where: { id: taskId },
      data: {
        state: to,
        startedAt: to === "IN_PROGRESS" && !t.startedAt ? now : t.startedAt,
        completedAt: to === "COMPLETED" ? now : t.completedAt,
      },
    }),
    prisma.taskEvent.create({
      data: {
        taskId,
        actorKind: "HUMAN",
        actorRef: v.id,
        actorName,
        action: "state_change",
        fromState: t.state,
        toState: to,
        note: note || null,
      },
    }),
  ]);
  return { ok: true };
}

/** The states this viewer could move the task to right now. */
export function offeredStates(from: TaskState, task: Parameters<typeof taskTransitionProblem>[2]): TaskState[] {
  const all: TaskState[] = [
    "TRIAGED",
    "PLANNED",
    "ASSIGNED",
    "IN_PROGRESS",
    "BLOCKED",
    "REVIEW",
    "APPROVED",
    "COMPLETED",
    "ARCHIVED",
    "CANCELLED",
  ];
  return all.filter((s) => taskTransitionProblem(from, s, task) === null);
}
