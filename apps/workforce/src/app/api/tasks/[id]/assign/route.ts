import { prisma } from "@app/db";
import { memberOr401 } from "@/lib/guard";
import { canAssignTo, canWrite } from "@app/core";
import { taskAssigned } from "@/lib/notify";

export const dynamic = "force-dynamic";

/**
 * Reassign a task.
 *
 * Two separate permissions, and both are needed: you must be able to change
 * this task, and you must be able to give work to the person you are naming.
 * Being able to edit a task does not make everybody in the company available to
 * put on it.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await memberOr401();
  if (!auth) return new Response(null, { status: 303, headers: { Location: "/" } });

  const { id } = await ctx.params;
  const form = await req.formData();
  const assigneeId = String(form.get("assigneeId") || "").trim();

  const url = new URL(`/tasks/${id}`, req.url);
  const fail = (m: string) => {
    url.searchParams.set("error", m);
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  };

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return fail("That task no longer exists.");

  const record = {
    ownerId: task.ownerId,
    assigneeId: task.assigneeId,
    requesterId: task.requesterId,
    entityId: task.entityId,
    departmentId: task.departmentId,
    confidentiality: task.confidentiality,
  };
  if (!canWrite(auth.viewer, record)) return fail("You cannot change this task.");

  if (assigneeId && !canAssignTo(auth.viewer, assigneeId)) {
    return fail("You cannot assign work to that person.");
  }

  const next = await prisma.teamMember.findUnique({
    where: { id: assigneeId || "none" },
    select: { name: true },
  });
  if (assigneeId && !next) return fail("That person is not on the team.");

  // Told, not left to be discovered. Skipped when somebody takes a task
  // themselves — nobody needs an email about their own click.
  if (assigneeId && assigneeId !== auth.member.id) {
    taskAssigned(assigneeId, { id: task.id, ref: task.ref, title: task.title }, auth.member.name);
  }

  await prisma.$transaction([
    prisma.task.update({
      where: { id },
      data: {
        assigneeId: assigneeId || null,
        // Naming somebody moves a triaged task along; an unassignment sends it
        // back so it does not sit in ASSIGNED with nobody on it.
        state: assigneeId
          ? task.state === "NEW" || task.state === "TRIAGED" || task.state === "PLANNED"
            ? "ASSIGNED"
            : task.state
          : task.state === "ASSIGNED"
            ? "TRIAGED"
            : task.state,
      },
    }),
    prisma.taskEvent.create({
      data: {
        taskId: id,
        actorKind: "HUMAN",
        actorRef: auth.member.id,
        actorName: auth.member.name,
        action: assigneeId ? "assigned" : "unassigned",
        note: assigneeId ? `Assigned to ${next!.name}.` : "Returned to the pool.",
      },
    }),
  ]);

  url.searchParams.set("done", "1");
  return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
}
