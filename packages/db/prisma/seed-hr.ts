/**
 * Seed the departments and open an employee file for everyone.
 *
 * Card details are deliberately NOT copied onto the employee record. The
 * business card stays the single published source and the portal reads it live;
 * duplicating it here would create two versions of a person's job title that
 * drift apart, and the whole point of locking the fields is that there is one
 * answer to what the card says.
 *
 * What is imported is the job title from the card onto TeamMember.title, so the
 * directory and the org chart can show it without joining to the card on every
 * query. That one is a cache, refreshed on every run.
 *
 *   npm --workspace @app/db run seed:hr
 */
import { PrismaClient } from "@prisma/client";
import {
  DEPARTMENTS,
  DEPARTMENT_IDS,
  STATUTORY_ANNUAL_LEAVE_DAYS,
  type EntityId,
} from "@app/core";

const prisma = new PrismaClient();

/** What each department is for. Descriptive, and editable by HR afterwards. */
const PURPOSE: Record<string, string> = {
  GOV: "Board support, delegated authority, policy and the decision register.",
  OPS: "Running the business day to day: process, service quality and the work-item lifecycle.",
  FIN: "Budgeting, invoicing, collections, payments, tax and procurement across the entities.",
  PEO: "Hiring, employee records, leave, onboarding and offboarding, and the org structure.",
  COM: "Selling: leads, proposals, pricing, contracts and the partner and reseller network.",
  DEL: "Delivering client projects — intake, planning, change control, acceptance and closure.",
  TEC: "Building and running the products and the platform they sit on.",
  MKT: "Brand, content, campaigns and the public site.",
  LRC: "Legal, contracts, privacy, risk and regulatory compliance across four jurisdictions.",
};

async function seedDepartments() {
  for (const [i, code] of DEPARTMENT_IDS.entries()) {
    const d = DEPARTMENTS[code];
    await prisma.department.upsert({
      where: { code },
      // The head is an operational decision, so it is never reset by a re-run.
      update: { name: d.name, executiveOwner: d.executiveOwner, purpose: PURPOSE[code], position: i },
      create: { code, name: d.name, executiveOwner: d.executiveOwner, purpose: PURPOSE[code], position: i },
    });
  }
  console.log(`[hr] departments: ${DEPARTMENT_IDS.length}`);
}

/**
 * The job title shown in the directory, taken from the card.
 *
 * `roleCopy` holds free text per locale for anyone added recently; `roleKey` is
 * a legacy key ("founder", "ops") whose display text lives in the web app's
 * translations. Only the first can be read here, so a roleKey person keeps
 * whatever title they already had rather than being given the raw key as a job
 * title, which would read as a bug on their profile.
 */
function titleFromCard(person: { roleKey: string | null; roleCopy: unknown }): string | null {
  const copy = person.roleCopy as Record<string, string> | null;
  if (copy && typeof copy === "object") {
    const en = copy.en ?? Object.values(copy)[0];
    if (typeof en === "string" && en.trim()) return en.trim();
  }
  return null;
}

async function importCardTitles() {
  const members = await prisma.teamMember.findMany({
    where: { personId: { not: null } },
    include: { person: { select: { roleKey: true, roleCopy: true } } },
  });

  let set = 0;
  for (const m of members) {
    if (!m.person) continue;
    const title = titleFromCard(m.person);
    if (!title || title === m.title) continue;
    await prisma.teamMember.update({ where: { id: m.id }, data: { title } });
    set++;
  }
  console.log(`[hr] job titles imported from cards: ${set}`);
}

/**
 * Open a file for everyone who does not have one.
 *
 * Status is ACTIVE rather than ONBOARDING for people already working here —
 * putting the existing team into an onboarding state would generate a joiner
 * checklist for each of them, which is noise, not a control. Dates are left
 * null because nobody has told us when anyone started, and a made-up start date
 * on an employment record is worse than an empty one.
 */
async function openEmployeeFiles() {
  const members = await prisma.teamMember.findMany({
    where: { employeeRecord: { is: null }, status: "ACTIVE" },
    select: { id: true, entityId: true, email: true },
  });

  for (const m of members) {
    await prisma.employeeRecord.create({
      data: {
        memberId: m.id,
        status: "ACTIVE",
        contractEntityId: m.entityId,
      },
    });
  }
  console.log(`[hr] employee files opened: ${members.length}`);
}

/**
 * Open this year's annual-leave balance at the statutory minimum for the
 * entity. HR sets the real entitlement from the contract; this only ensures a
 * balance exists so a request is measured against something.
 */
async function openLeaveBalances() {
  const year = new Date().getFullYear();
  const members = await prisma.teamMember.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, entityId: true },
  });

  let opened = 0;
  let noEntity = 0;
  for (const m of members) {
    if (!m.entityId) {
      // No entity means no jurisdiction, and no jurisdiction means no
      // statutory floor to apply. Left for HR rather than guessed.
      noEntity++;
      continue;
    }
    const entitled = STATUTORY_ANNUAL_LEAVE_DAYS[m.entityId as EntityId];
    if (entitled === undefined) continue;

    const existing = await prisma.leaveBalance.findUnique({
      where: { memberId_year_type: { memberId: m.id, year, type: "ANNUAL" } },
    });
    if (existing) continue;

    await prisma.leaveBalance.create({
      data: { memberId: m.id, year, type: "ANNUAL", entitledDays: entitled },
    });
    opened++;
  }
  console.log(
    `[hr] leave balances for ${year}: ${opened} opened at the statutory minimum` +
      (noEntity ? `, ${noEntity} skipped for having no entity` : "")
  );
}

async function report() {
  const [files, balances, depts, withTitle, total] = await Promise.all([
    prisma.employeeRecord.count(),
    prisma.leaveBalance.count(),
    prisma.department.count(),
    prisma.teamMember.count({ where: { title: { not: null } } }),
    prisma.teamMember.count({ where: { status: "ACTIVE" } }),
  ]);
  console.log("");
  console.log(`[hr] ${depts} departments · ${files} employee files · ${balances} leave balances`);
  console.log(`[hr] ${withTitle} of ${total} people have a job title on their card`);
}

async function main() {
  await seedDepartments();
  await importCardTitles();
  await openEmployeeFiles();
  await openLeaveBalances();
  await report();
}

main()
  .catch((e) => {
    console.error("[hr] seed failed", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
