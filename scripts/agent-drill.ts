/**
 * A drill: put real work in front of the agents and show what they propose.
 *
 * Creates two tasks — one obviously legal, one obviously personal data — runs
 * the suite, prints what each agent said, then removes the tasks again. Nothing
 * is left behind except the AgentRun rows, which are the audit trail and should
 * survive.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const owner = await prisma.teamMember.findFirst({ where: { role: "CEO" } });
  if (!owner) throw new Error("no CEO to own the drill tasks");

  const made = await Promise.all([
    prisma.task.create({
      data: {
        ref: `DRILL-LEGAL-${Date.now()}`,
        title: "Review the supplier contract and countersign the NDA",
        description: "Partner agreement renewal for the Spanish entity.",
        requesterId: owner.id,
        ownerId: owner.id,
        entityId: "ORG-ES",
        state: "NEW",
      },
    }),
    prisma.task.create({
      data: {
        ref: `DRILL-HR-${Date.now()}`,
        title: "Upload passport scan and salary letter for onboarding",
        description: "New joiner paperwork.",
        requesterId: owner.id,
        ownerId: owner.id,
        entityId: "ORG-EG",
        // Deliberately mis-classified, so AI-COMP has something real to catch.
        confidentiality: "INTERNAL",
        state: "NEW",
      },
    }),
  ]);

  const res = await fetch("http://app-orchestrator:8080/v1/orchestrator/run", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  const body = await res.json();
  console.log("cycle:", JSON.stringify(body.data.results.find((r: any) => r.name === "runAgents")));
  console.log("");

  const runs = await prisma.agentRun.findMany({
    where: { taskId: { in: made.map((m) => m.id) } },
    orderBy: { startedAt: "asc" },
  });

  console.log(`${runs.length} proposal(s) about the drill tasks:`);
  for (const r of runs) {
    const out = r.output as { summary?: string } | null;
    console.log(`  ${r.agentKey.padEnd(9)} ${r.outcome.padEnd(8)} conf=${r.confidence ?? "-"}`);
    console.log(`            ${out?.summary ?? ""}`);
    if (r.gateReason) console.log(`            gate: ${r.gateReason}`);
  }

  const queued = await prisma.approvalRequest.findMany({
    where: { taskId: { in: made.map((m) => m.id) }, outcome: "PENDING" },
  });
  console.log("");
  console.log(`${queued.length} of them reached the approvals queue for a person to decide.`);

  const states = await prisma.task.findMany({
    where: { id: { in: made.map((m) => m.id) } },
    select: { ref: true, state: true, departmentId: true, confidentiality: true },
  });
  console.log("");
  console.log("task state after the cycle (unchanged is correct — every agent is disabled):");
  for (const s of states) {
    console.log(`  ${s.ref} state=${s.state} dept=${s.departmentId ?? "-"} class=${s.confidentiality}`);
  }

  await prisma.approvalRequest.deleteMany({ where: { taskId: { in: made.map((m) => m.id) } } });
  await prisma.task.deleteMany({ where: { id: { in: made.map((m) => m.id) } } });
  console.log("");
  console.log("drill tasks removed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
