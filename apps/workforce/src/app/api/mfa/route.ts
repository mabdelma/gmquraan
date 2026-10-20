import { prisma } from "@app/db";
import { getPendingMember } from "@/lib/session";
import { checkSecondFactor, completeSession } from "@/lib/mfa";

export const dynamic = "force-dynamic";

/**
 * Present the second factor.
 *
 * Failures are counted on the member, using the same lockout the password path
 * uses. Without that, the second factor would be the one part of sign-in an
 * attacker could brute-force freely — and six digits is only a million tries.
 */
export async function POST(req: Request) {
  const pending = await getPendingMember();
  if (!pending) return new Response(null, { status: 303, headers: { Location: "/" } });

  const form = await req.formData();
  const token = String(form.get("token") || "").trim();

  const problem = await checkSecondFactor(pending.id, token);
  if (problem) {
    const m = await prisma.teamMember.findUnique({
      where: { id: pending.id },
      select: { failedLogins: true },
    });
    await prisma.teamMember.update({
      where: { id: pending.id },
      data: { failedLogins: (m?.failedLogins ?? 0) + 1 },
    });

    const url = new URL("/mfa", req.url);
    url.searchParams.set("error", problem);
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  }

  await completeSession(pending.tokenHash);
  await prisma.teamMember.update({
    where: { id: pending.id },
    data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
  });

  return new Response(null, { status: 303, headers: { Location: "/home" } });
}
