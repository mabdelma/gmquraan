/**
 * Build the organisation structure.
 *
 * Generates the group-level seats and one full structure per branch, then
 * places the people who actually exist. It does not invent anybody: a seat with
 * no holder stays vacant, and vacancies are reported at the end so the gaps are
 * visible rather than implied.
 *
 * Idempotent. Positions are upserted on their code, and a placement is only
 * written when the seat is empty — re-running never moves somebody who was
 * deliberately placed elsewhere.
 *
 *   npm --workspace @app/db run seed:org
 */
import { PrismaClient } from "@prisma/client";
import {
  BRANCH_TO_ENTITY,
  ENTITIES,
  ENTITY_IDS,
  ROLE_DEFAULT_LEVEL,
  allPositions,
  type EntityId,
  type GmRole,
} from "@app/core";

const prisma = new PrismaClient();

/**
 * Who sits where, by email.
 *
 * Only what the records already support. Mohamed is Group CEO — that is on the
 * Example City licence and the Canadian profile as owner and person with
 * significant control. Amira is the sole director of the Canadian corporation,
 * so she holds that entity's general manager seat. Neveen is the contact of
 * record on the Example Country branch, so she holds Example Country's.
 *
 * Everyone else stays an employee at their branch. Nothing here is inferred
 * from a job title nobody wrote down.
 */
const PLACEMENTS: Record<string, { code: string; role: GmRole }> = {
  "founder@example.com": { code: "GROUP-GROUP_CEO", role: "CEO" },
  "director@example.com": { code: "ORG-CA-ENTITY_GM", role: "ENTITY_GM" },
  "neveen@example.com": { code: "ORG-EG-ENTITY_GM", role: "ENTITY_GM" },
};

async function seedPositions() {
  const specs = allPositions(ENTITY_IDS);

  // Two passes: every seat has to exist before any parent link can be made,
  // because a parent may appear later in the list than its child.
  for (const p of specs) {
    await prisma.orgPosition.upsert({
      where: { code: p.code },
      update: { tier: p.tier, role: p.role, title: p.title, approvalLevel: p.approvalLevel },
      create: {
        code: p.code,
        tier: p.tier,
        role: p.role,
        title: p.title,
        entityId: p.entityId,
        departmentId: p.departmentId,
        approvalLevel: p.approvalLevel,
      },
    });
  }

  for (const p of specs) {
    if (!p.parentCode) continue;
    const parent = await prisma.orgPosition.findUnique({ where: { code: p.parentCode } });
    if (!parent) {
      console.warn(`[org] ${p.code} names a parent that does not exist: ${p.parentCode}`);
      continue;
    }
    await prisma.orgPosition.update({ where: { code: p.code }, data: { parentId: parent.id } });
  }

  console.log(`[org] positions: ${specs.length} seats across ${ENTITY_IDS.length} branches and the group`);
}

/** Fill in the entity for anyone who has none, from their branch on the card. */
async function backfillEntities() {
  const members = await prisma.teamMember.findMany({
    where: { entityId: null },
    include: { person: { select: { branchSlugs: true } } },
  });

  let fixed = 0;
  for (const m of members) {
    const slugs = Array.isArray(m.person?.branchSlugs) ? (m.person!.branchSlugs as string[]) : [];
    const entityId = slugs.map((s) => BRANCH_TO_ENTITY[s]).find(Boolean);
    if (!entityId) continue;
    await prisma.teamMember.update({ where: { id: m.id }, data: { entityId } });
    fixed++;
  }
  if (fixed) console.log(`[org] entity backfilled for ${fixed} member(s) — Example Country had no mapping until now`);
}

async function placePeople() {
  let placed = 0;

  for (const [email, target] of Object.entries(PLACEMENTS)) {
    const member = await prisma.teamMember.findUnique({ where: { email } });
    if (!member) {
      console.warn(`[org] no member ${email} — seat ${target.code} left vacant`);
      continue;
    }

    const seat = await prisma.orgPosition.findUnique({ where: { code: target.code }, include: { holder: true } });
    if (!seat) {
      console.warn(`[org] no seat ${target.code}`);
      continue;
    }
    if (seat.holder && seat.holder.id !== member.id) {
      console.warn(`[org] ${target.code} already held by ${seat.holder.email} — leaving it alone`);
      continue;
    }

    await prisma.teamMember.update({
      where: { id: member.id },
      data: {
        positionId: seat.id,
        role: target.role,
        approvalLevel: ROLE_DEFAULT_LEVEL[target.role],
        departmentId: member.departmentId ?? seat.departmentId,
      },
    });
    placed++;
  }

  console.log(`[org] placed ${placed} people into named seats`);
}

/**
 * Give everyone a reporting line.
 *
 * An employee reports to their branch's general manager. Where that seat is
 * vacant they are left without a manager rather than being attached to an
 * arbitrary one — a false reporting line is worse than a missing one, because
 * it silently grants somebody visibility of their work.
 */
async function linkReportingLines() {
  const holders = await prisma.teamMember.findMany({
    where: { positionId: { not: null } },
    include: { position: true },
  });
  const gmByEntity = new Map<string, string>();
  for (const h of holders) {
    if (h.position?.tier === "ENTITY_GM" && h.position.entityId) gmByEntity.set(h.position.entityId, h.id);
  }

  const ceo = holders.find((h) => h.position?.tier === "GROUP_CEO");

  // The position has to be included: without it `m.position` is undefined,
  // the entity-GM branch below never fires, and a GM is handed themselves as
  // their own manager. The self-reference guard catches that, but the result is
  // a GM with no reporting line at all rather than one reporting to the group.
  const unmanaged = await prisma.teamMember.findMany({
    where: { managerId: null, status: "ACTIVE" },
    include: { position: true },
  });

  let linked = 0;
  let stranded = 0;
  for (const m of unmanaged) {
    if (ceo && m.id === ceo.id) continue; // the CEO reports to the board seat, which is vacant

    const gmId = m.entityId ? gmByEntity.get(m.entityId) : undefined;
    // An entity GM reports to the group, not to themselves.
    const managerId = m.position?.tier === "ENTITY_GM" ? ceo?.id : (gmId ?? ceo?.id);

    if (!managerId || managerId === m.id) {
      stranded++;
      continue;
    }
    await prisma.teamMember.update({ where: { id: m.id }, data: { managerId } });
    linked++;
  }

  console.log(`[org] reporting lines: ${linked} linked, ${stranded} left without a manager`);
}

async function report() {
  const positions = await prisma.orgPosition.findMany({ include: { holder: true } });
  const vacant = positions.filter((p) => !p.holder);

  console.log("");
  console.log(`[org] ${positions.length - vacant.length} of ${positions.length} seats filled`);
  for (const e of ENTITY_IDS) {
    const mine = positions.filter((p) => p.entityId === e);
    const filled = mine.filter((p) => p.holder).length;
    const staff = await prisma.teamMember.count({ where: { entityId: e, status: "ACTIVE" } });
    console.log(
      `[org]   ${e.padEnd(8)} ${ENTITIES[e as EntityId].legalName.padEnd(38)} ${String(filled).padStart(2)}/${String(mine.length).padStart(2)} seats · ${staff} people`
    );
  }
  const group = positions.filter((p) => !p.entityId);
  console.log(`[org]   GROUP    ${"Group-level seats".padEnd(38)} ${group.filter((p) => p.holder).length}/${group.length} seats`);
}

async function main() {
  await seedPositions();
  await backfillEntities();
  await placePeople();
  await linkReportingLines();
  await report();
}

main()
  .catch((e) => {
    console.error("[org] seed failed", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
