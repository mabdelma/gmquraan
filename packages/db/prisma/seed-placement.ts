/**
 * Reflect the hierarchy in the data.
 *
 * The structure has existed since the org chart was generated, and almost
 * nobody was in it: everybody reported straight to the CEO, one person had a
 * department, and no employee numbers had been issued. This closes what can be
 * closed from evidence already in the system.
 *
 * The rule it follows: derive, never invent. A department comes from the job
 * title on somebody's own business card. An entity comes from the branch on
 * their card, or from the city they say they work in. Anything that would
 * require deciding something about a person — who runs Spain, who reports to
 * whom below the general managers — is left alone and reported at the end, for
 * a human to settle in the placement console.
 *
 *   npm --workspace @app/db run seed:placement
 */
import { PrismaClient } from "@prisma/client";
import {
  ROLE_DEFAULT_LEVEL,
  requiredDocumentsForRole,
  type DepartmentId,
  type EntityId,
  type GmRole,
} from "@app/core";

const prisma = new PrismaClient();

/**
 * Department from the words in somebody's own job title.
 *
 * Ordered, first match wins, and deliberately narrow — a title that matches
 * nothing gets no department rather than a plausible-looking guess.
 */
const TITLE_TO_DEPARTMENT: readonly { pattern: RegExp; department: DepartmentId; because: string }[] = [
  { pattern: /\b(ai|data science|developer|engineer|software|technolog)/i, department: "TEC", because: "a technical title" },
  { pattern: /\b(designer|creative|graphic|motion|multimedia|brand)/i, department: "MKT", because: "a creative title" },
  { pattern: /\b(market|campaign|content|social)/i, department: "MKT", because: "a marketing title" },
  { pattern: /\b(sales|commercial|partnership|business development)/i, department: "COM", because: "a commercial title" },
  { pattern: /\b(finance|account|controller|treasur)/i, department: "FIN", because: "a finance title" },
  { pattern: /\b(legal|compliance|counsel)/i, department: "LRC", because: "a legal title" },
  { pattern: /\b(people|hr|talent|recruit)/i, department: "PEO", because: "a people title" },
  { pattern: /\b(operation|ops|coordinator|administrat)/i, department: "OPS", because: "an operations title" },
  { pattern: /\b(delivery|project|programme|program manager)/i, department: "DEL", because: "a delivery title" },
];

/** City on the card to the branch that operates there. */
const CITY_TO_ENTITY: readonly { pattern: RegExp; entity: EntityId }[] = [
  { pattern: /\b(cairo|alexandria|egypt)\b/i, entity: "ORG-EG" },
  { pattern: /\b(valladolid|madrid|spain|españa)\b/i, entity: "ORG-ES" },
  { pattern: /\b(abu dhabi|dubai|uae|emirates)\b/i, entity: "ORG-UAE" },
  { pattern: /\b(ontario|mississauga|toronto|canada)\b/i, entity: "ORG-CA" },
];

type Note = { who: string; what: string; because: string };
const derived: Note[] = [];
const leftAlone: Note[] = [];

async function deriveDepartments() {
  const people = await prisma.teamMember.findMany({
    where: { departmentId: null, status: "ACTIVE" },
    select: { id: true, name: true, title: true, role: true },
  });

  for (const p of people) {
    // A general manager runs a branch rather than a function, so no department
    // is the correct answer for them, not a missing one.
    if (p.role === "ENTITY_GM" || p.role === "CEO" || p.role === "BOARD") continue;

    const hit = p.title ? TITLE_TO_DEPARTMENT.find((r) => r.pattern.test(p.title!)) : undefined;
    if (!hit) {
      leftAlone.push({ who: p.name, what: "department", because: p.title ? `"${p.title}" matched no rule` : "no job title on their card" });
      continue;
    }
    await prisma.teamMember.update({ where: { id: p.id }, data: { departmentId: hit.department } });
    derived.push({ who: p.name, what: `department ${hit.department}`, because: `${hit.because}: "${p.title}"` });
  }
}

async function deriveEntities() {
  const people = await prisma.teamMember.findMany({
    where: { entityId: null, status: "ACTIVE" },
    include: { person: { select: { location: true, branchSlugs: true } } },
  });

  for (const p of people) {
    const location = p.person?.location ?? "";
    const hit = CITY_TO_ENTITY.find((r) => r.pattern.test(location));
    if (!hit) {
      leftAlone.push({ who: p.name, what: "branch", because: location ? `location "${location}" matched no branch` : "no location on their card" });
      continue;
    }
    await prisma.teamMember.update({ where: { id: p.id }, data: { entityId: hit.entity } });
    derived.push({ who: p.name, what: `branch ${hit.entity}`, because: `their card says "${location}"` });
  }
}

/**
 * Reporting lines, now that entities are known.
 *
 * Everybody reports to the general manager of their own branch. Where that seat
 * is vacant they stay with whoever they have — usually the CEO — rather than
 * being attached to somebody arbitrary, because a false reporting line silently
 * grants sight of their work.
 */
async function relinkReportingLines() {
  const gms = await prisma.teamMember.findMany({
    where: { role: "ENTITY_GM", status: "ACTIVE" },
    select: { id: true, name: true, entityId: true },
  });
  const gmByEntity = new Map(gms.filter((g) => g.entityId).map((g) => [g.entityId!, g]));

  const staff = await prisma.teamMember.findMany({
    where: { status: "ACTIVE", role: { notIn: ["CEO", "BOARD", "ENTITY_GM"] } },
    select: { id: true, name: true, entityId: true, managerId: true },
  });

  for (const s of staff) {
    const gm = s.entityId ? gmByEntity.get(s.entityId) : undefined;
    if (!gm) {
      leftAlone.push({ who: s.name, what: "manager", because: s.entityId ? `${s.entityId} has no general manager` : "no branch" });
      continue;
    }
    if (s.managerId === gm.id) continue;
    await prisma.teamMember.update({ where: { id: s.id }, data: { managerId: gm.id } });
    derived.push({ who: s.name, what: `reports to ${gm.name}`, because: `general manager of ${s.entityId}` });
  }
}

/** Issue an employee number to anybody without one, in a stable order. */
async function issueEmployeeNumbers() {
  const records = await prisma.employeeRecord.findMany({
    where: { employeeNo: null },
    include: { member: { select: { name: true, createdAt: true } } },
    orderBy: { createdAt: "asc" },
  });
  const taken = await prisma.employeeRecord.count({ where: { employeeNo: { not: null } } });

  let n = taken;
  for (const r of records) {
    n++;
    const employeeNo = `ORG-${String(n).padStart(4, "0")}`;
    await prisma.employeeRecord.update({ where: { id: r.id }, data: { employeeNo } });
    derived.push({ who: r.member.name, what: `employee number ${employeeNo}`, because: "none had been issued" });
  }
}

/** Open the required document pack for everybody, from their role. */
async function openPacks() {
  const people = await prisma.teamMember.findMany({
    where: { status: "ACTIVE" },
    include: { employeeRecord: true },
  });

  let created = 0;
  for (const p of people) {
    const required = requiredDocumentsForRole(
      p.role as GmRole,
      p.employeeRecord?.employmentType ?? "FULL_TIME"
    );
    for (const r of required) {
      const existing = await prisma.employeeDocument.findUnique({
        where: { memberId_code: { memberId: p.id, code: r.code } },
      });
      if (existing) continue;
      await prisma.employeeDocument.create({
        data: {
          memberId: p.id,
          code: r.code,
          name: r.name,
          classification: r.classification,
          mandatory: r.mandatory,
          status: "MISSING",
        },
      });
      created++;
    }
  }
  console.log(`[placement] document pack items opened: ${created}`);
}

/** Bring approval levels back in line with role after any change above. */
async function alignApprovalLevels() {
  const people = await prisma.teamMember.findMany({ where: { status: "ACTIVE" } });
  for (const p of people) {
    const expected = ROLE_DEFAULT_LEVEL[p.role as GmRole];
    // Only ever raises to the role default; a level granted above it for a
    // specific mandate is a decision somebody made and is left alone.
    if (p.approvalLevel === expected) continue;
    const order = ["A0", "A1", "A2", "A3", "A4"];
    if (order.indexOf(p.approvalLevel) > order.indexOf(expected)) continue;
    await prisma.teamMember.update({ where: { id: p.id }, data: { approvalLevel: expected } });
    derived.push({ who: p.name, what: `approval level ${expected}`, because: `the default for ${p.role}` });
  }
}

async function main() {
  await deriveDepartments();
  await deriveEntities();
  await relinkReportingLines();
  await issueEmployeeNumbers();
  await alignApprovalLevels();
  await openPacks();

  console.log("");
  console.log(`[placement] ${derived.length} change(s) derived from existing records:`);
  for (const d of derived) console.log(`  ${d.who}: ${d.what} — ${d.because}`);

  if (leftAlone.length) {
    console.log("");
    console.log(`[placement] ${leftAlone.length} left for a person to decide:`);
    for (const d of leftAlone) console.log(`  ${d.who}: no ${d.what} — ${d.because}`);
  }
}

main()
  .catch((e) => {
    console.error("[placement] failed", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
