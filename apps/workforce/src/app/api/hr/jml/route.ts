import { prisma } from "@app/db";
import { memberOr401 } from "@/lib/guard";
import { JML_KINDS, JML_STEPS, isGroupWide, jmlCompletionProblem, type JmlKind } from "@app/core";

export const dynamic = "force-dynamic";

/**
 * Joiner, mover and leaver.
 *
 * The steps marked `automated` in the controlled config had no trigger — they
 * were checkboxes somebody ticked, which is the thing a control is not. Closing
 * a leaver now actually revokes the sessions and suspends the account, in the
 * same transaction that records it.
 *
 * access_control_policy.md: "Joiner, mover, and leaver events must update
 * access promptly." Promptly means as part of the act, not as a reminder.
 */
export async function POST(req: Request) {
  const auth = await memberOr401();
  if (!auth) return new Response(null, { status: 303, headers: { Location: "/" } });

  const url = new URL("/hr", req.url);
  const fail = (m: string) => {
    url.searchParams.set("error", m);
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  };

  const mayAct = isGroupWide(auth.member.role) || auth.member.departmentId === "PEO";
  if (!mayAct) return fail("Only People can run joiner, mover and leaver events.");

  const form = await req.formData();
  const action = String(form.get("action") || "");

  if (action === "open") {
    const memberId = String(form.get("memberId") || "");
    const kind = String(form.get("kind") || "") as JmlKind;
    const effective = String(form.get("effectiveDate") || "");

    if (!JML_KINDS.includes(kind)) return fail("Unknown event type.");
    const subject = await prisma.teamMember.findUnique({ where: { id: memberId }, select: { id: true } });
    if (!subject) return fail("No such person.");
    if (!effective) return fail("Give the event an effective date.");

    await prisma.jmlEvent.create({
      data: { memberId, kind, effectiveDate: new Date(effective), status: "OPEN", completedSteps: [] },
    });
    url.searchParams.set("done", "1");
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  }

  const eventId = String(form.get("eventId") || "");
  const event = await prisma.jmlEvent.findUnique({
    where: { id: eventId },
    include: { member: { select: { id: true, name: true } } },
  });
  if (!event) return fail("No such event.");

  const done: string[] = Array.isArray(event.completedSteps) ? (event.completedSteps as string[]) : [];

  if (action === "step") {
    const step = String(form.get("step") || "");
    const known = JML_STEPS[event.kind as JmlKind].some((s) => s.key === step);
    if (!known) return fail("That is not a step of this event.");

    const next = done.includes(step) ? done.filter((d) => d !== step) : [...done, step];
    await prisma.jmlEvent.update({ where: { id: eventId }, data: { completedSteps: next } });
    url.searchParams.set("done", "1");
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  }

  if (action === "close") {
    // The automated steps are performed here rather than ticked, so they count
    // as done because they happened.
    const automated = JML_STEPS[event.kind as JmlKind].filter((s) => s.automated).map((s) => s.key);
    const withAutomated = [...new Set([...done, ...automated])];

    const problem = jmlCompletionProblem(event.kind as JmlKind, withAutomated);
    if (problem) return fail(problem);

    const ops: unknown[] = [];

    if (event.kind === "LEAVER") {
      // The two that actually close the door.
      ops.push(
        prisma.teamSession.updateMany({
          where: { memberId: event.memberId, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
        prisma.teamLoginToken.updateMany({
          where: { memberId: event.memberId, usedAt: null },
          data: { usedAt: new Date() },
        }),
        prisma.teamMember.update({
          where: { id: event.memberId },
          data: { status: "OFFBOARDED" },
        }),
        prisma.employeeRecord.updateMany({
          where: { memberId: event.memberId },
          data: { status: "OFFBOARDED", endDate: event.effectiveDate },
        })
      );
    }

    ops.push(
      prisma.jmlEvent.update({
        where: { id: eventId },
        data: { status: "COMPLETED", completedSteps: withAutomated, completedAt: new Date() },
      })
    );

    await prisma.$transaction(ops as never);

    if (event.kind === "LEAVER") {
      // Recorded against the person, because "their access was removed" is a
      // fact somebody may later need to evidence with a date on it.
      await prisma.agentRun.create({
        data: {
          agentKey: "AI-REC",
          outcome: "APPLIED",
          gateReason: `Offboarding closed for ${event.member.name} by ${auth.member.name}: sessions revoked, sign-in links burned, account suspended.`,
          dryRun: false,
          finishedAt: new Date(),
        },
      });
    }

    url.searchParams.set("done", "1");
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  }

  return fail("Unknown action.");
}
