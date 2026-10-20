import { prisma } from "@app/db";
import { memberOr401 } from "@/lib/guard";
import { taskAssigned } from "@/lib/notify";
import {
  canAssignTo,
  newTaskProblem,
  proposeConfidentiality,
  taskRef,
  type DepartmentId,
  type EntityId,
} from "@app/core";

export const dynamic = "force-dynamic";

/**
 * Allocate the next reference for an entity, department and year.
 *
 * `ref` is unique in the database, so two people creating a task in the same
 * second would otherwise collide. Rather than lock a counter table, this counts,
 * writes, and retries on the unique violation — contention is rare and a retry
 * is cheaper than a lock held across a transaction.
 */
async function createWithRef(
  entityId: EntityId,
  departmentId: DepartmentId,
  data: Record<string, unknown>
): Promise<{ id: string; ref: string }> {
  const year = new Date().getFullYear();

  for (let attempt = 0; attempt < 5; attempt++) {
    const used = await prisma.task.count({
      where: { ref: { startsWith: `${entityId}-${departmentId}-TSK-${year}-` } },
    });
    const ref = taskRef({ entityId, departmentId, year, sequence: used + 1 + attempt });
    try {
      const t = await prisma.task.create({ data: { ...data, ref } as never });
      return { id: t.id, ref: t.ref };
    } catch (e) {
      // P2002 is the unique violation; anything else is a real failure.
      if ((e as { code?: string }).code !== "P2002") throw e;
    }
  }
  throw new Error("Could not allocate a task reference after five attempts.");
}

export async function POST(req: Request) {
  const auth = await memberOr401();
  if (!auth) return new Response(null, { status: 303, headers: { Location: "/" } });

  const form = await req.formData();
  const str = (k: string) => String(form.get(k) || "").trim();

  const title = str("title");
  const ownerId = str("ownerId") || auth.member.id;
  const assigneeId = str("assigneeId");

  const back = new URL("/tasks/new", req.url);
  const fail = (m: string) => {
    back.searchParams.set("error", m);
    if (title) back.searchParams.set("title", title);
    return new Response(null, { status: 303, headers: { Location: back.pathname + back.search } });
  };

  const problem = newTaskProblem({ title, ownerId, dueAt: str("dueAt") || null });
  if (problem) return fail(problem);

  // The reporting-line rule, checked rather than trusted from the form. The
  // page only offers people you may assign to, but the page is not the control.
  if (!canAssignTo(auth.viewer, ownerId)) {
    return fail("You cannot make that person accountable for a task.");
  }
  if (assigneeId && !canAssignTo(auth.viewer, assigneeId)) {
    return fail("You cannot assign work to that person.");
  }

  const entityId = (str("entityId") || auth.member.entityId || "ORG-ES") as EntityId;
  const departmentId = (str("departmentId") || auth.member.departmentId || "OPS") as DepartmentId;
  const description = str("description") || null;

  // Classification is proposed at capture rather than left to triage, because a
  // task naming a passport should not sit at INTERNAL even for an hour.
  const conf = proposeConfidentiality({ title, description });

  const outputs = str("expectedOutputs");
  const created = await createWithRef(entityId, departmentId, {
    title,
    description,
    requesterId: auth.member.id,
    ownerId,
    assigneeId: assigneeId || null,
    entityId,
    departmentId,
    priority: str("priority") || "P2",
    dueAt: str("dueAt") ? new Date(str("dueAt")) : null,
    acceptanceCriteria: str("acceptanceCriteria") || null,
    expectedOutputs: outputs ? outputs.split(",").map((s) => s.trim()).filter(Boolean) : null,
    destination: str("destination") || null,
    confidentiality: conf.value,
    // Assigning at creation skips triage — the work is already allocated.
    state: assigneeId ? "ASSIGNED" : "NEW",
  });

  if (assigneeId && assigneeId !== auth.member.id) {
    taskAssigned(assigneeId, { id: created.id, ref: created.ref, title }, auth.member.name);
  }

  await prisma.taskEvent.create({
    data: {
      taskId: created.id,
      actorKind: "HUMAN",
      actorRef: auth.member.id,
      actorName: auth.member.name,
      action: "created",
      toState: assigneeId ? "ASSIGNED" : "NEW",
      note: `Raised by ${auth.member.name}. Classified ${conf.value} — ${conf.reason}`,
    },
  });

  return new Response(null, { status: 303, headers: { Location: `/tasks/${created.id}` } });
}
