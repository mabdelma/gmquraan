import { prisma } from "@app/db";
import { memberOr401 } from "@/lib/guard";
import { GATE_MIN_LEVEL, gateFor, isGroupWide } from "@app/core";

export const dynamic = "force-dynamic";

/**
 * Agent controls.
 *
 * The asymmetry is deliberate. Disabling an agent takes effect immediately —
 * stopping something that is running is always safe and should never wait for
 * a second signature. Enabling one raises an approval instead, because it is an
 * access change under the autonomy matrix and it is the moment the system stops
 * proposing and starts acting.
 *
 * So a single administrator can always stop the machine, and cannot start it
 * alone.
 */
export async function POST(req: Request) {
  const auth = await memberOr401();
  if (!auth) return new Response(null, { status: 303, headers: { Location: "/" } });

  const url = new URL("/admin", req.url);
  const fail = (m: string) => {
    url.searchParams.set("error", m);
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  };

  if (!isGroupWide(auth.member.role)) return fail("You cannot change the agent register.");

  const form = await req.formData();
  const key = String(form.get("key") || "");
  const action = String(form.get("action") || "");

  const agent = await prisma.agentRegistry.findUnique({ where: { key } });
  if (!agent) return fail("No such agent.");

  if (action === "disable") {
    await prisma.$transaction([
      prisma.agentRegistry.update({ where: { key }, data: { enabled: false } }),
      prisma.agentRun.create({
        data: {
          agentKey: key,
          outcome: "APPLIED",
          gateReason: `Disabled by ${auth.member.name}.`,
          dryRun: false,
          finishedAt: new Date(),
        },
      }),
    ]);
    url.searchParams.set("done", "1");
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  }

  if (action === "request-enable") {
    if (agent.enabled) return fail("That agent is already enabled.");

    const gate = gateFor("access_change_restricted");
    const existing = await prisma.approvalRequest.findFirst({
      where: { action: "agent_enable", outcome: "PENDING", payload: { path: ["key"], equals: key } },
    });
    if (existing) return fail("There is already a request to enable that agent.");

    await prisma.approvalRequest.create({
      data: {
        action: "agent_enable",
        gate,
        summary: `Enable ${agent.key} (${agent.name}) to act unattended up to ${agent.maxGate}`,
        minLevel: GATE_MIN_LEVEL[gate],
        requestedByKind: "HUMAN",
        requestedByRef: auth.member.id,
        payload: { key, maxGate: agent.maxGate },
        expiresAt: new Date(Date.now() + 14 * 86_400_000),
      },
    });

    url.searchParams.set("done", "1");
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  }

  return fail("Unknown action.");
}
