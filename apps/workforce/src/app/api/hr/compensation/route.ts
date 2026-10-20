import { prisma } from "@app/db";
import { memberOr401 } from "@/lib/guard";
import { canSetCompensation, compensationProblem, type GmRole } from "@app/core";

export const dynamic = "force-dynamic";

/**
 * Record compensation.
 *
 * Setting is narrower than reading and nobody sets their own — the autonomy
 * matrix already rates payroll_change HUMAN_ONLY for machines, and this is the
 * same principle applied to people.
 *
 * A change closes the previous record rather than editing it, so the history of
 * what somebody was paid and from when survives. Pay history is exactly the
 * kind of record that gets asked about years later.
 */
export async function POST(req: Request) {
  const auth = await memberOr401();
  if (!auth) return new Response(null, { status: 303, headers: { Location: "/" } });

  const url = new URL("/hr/compensation", req.url);
  const fail = (m: string) => {
    url.searchParams.set("error", m);
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  };

  const form = await req.formData();
  const memberId = String(form.get("memberId") || "");

  const viewer = { id: auth.member.id, role: auth.member.role as GmRole, departmentId: auth.member.departmentId };
  if (!canSetCompensation(viewer, { memberId })) {
    return fail(
      memberId === auth.member.id
        ? "Nobody sets their own pay."
        : "Only Finance, the CEO or the CFO can record compensation."
    );
  }

  const record = await prisma.employeeRecord.findUnique({ where: { memberId }, select: { id: true } });
  if (!record) return fail("That person has no employee file yet.");

  const amount = Number(String(form.get("amount") || "0"));
  const input = {
    currency: String(form.get("currency") || "").toUpperCase(),
    amountMinor: Math.round(amount * 100),
    period: String(form.get("period") || ""),
    effectiveFrom: String(form.get("effectiveFrom") || ""),
  };

  const problem = compensationProblem(input);
  if (problem) return fail(problem);

  const from = new Date(input.effectiveFrom);

  await prisma.$transaction([
    // Close anything still open, rather than leaving two records live.
    prisma.compensation.updateMany({
      where: { recordId: record.id, effectiveTo: null },
      data: { effectiveTo: from },
    }),
    prisma.compensation.create({
      data: {
        recordId: record.id,
        currency: input.currency,
        amountMinor: input.amountMinor,
        period: input.period,
        effectiveFrom: from,
        note: String(form.get("note") || "").trim().slice(0, 300) || null,
      },
    }),
  ]);

  url.searchParams.set("done", "1");
  return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
}
