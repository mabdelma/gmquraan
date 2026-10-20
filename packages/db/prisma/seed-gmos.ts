/**
 * Seed the GM-OS registers.
 *
 * Idempotent by design — it runs on every deploy. Everything is upserted on a
 * natural key, and nothing that a human may have edited is overwritten:
 * re-running must never re-enable an agent someone deliberately turned off, or
 * reset an approval level that was granted for a mandate.
 *
 *   npm --workspace @app/db run seed:gmos
 */
import { PrismaClient } from "@prisma/client";
import { AGENTS, AGENT_KEYS, BRANCH_TO_ENTITY, ROLE_DEFAULT_LEVEL } from "@app/core";

const prisma = new PrismaClient();

/**
 * The one person who must exist for the portal to be usable at all: without an
 * administrator nobody can sign in and grant anyone else access.
 */
const BOOTSTRAP_ADMIN = {
  email: (process.env.GMOS_ADMIN_EMAIL || "founder@example.com").toLowerCase(),
  name: process.env.GMOS_ADMIN_NAME || "Mohamed Khedr Abdelmaged",
  role: "CEO" as const,
};

async function seedAgents() {
  for (const key of AGENT_KEYS) {
    const a = AGENTS[key];
    await prisma.agentRegistry.upsert({
      where: { key },
      // Purpose and name follow the catalogue; the ceiling and the enabled flag
      // are operational decisions and are left alone once set.
      update: { name: a.name, purpose: a.purpose },
      create: {
        key,
        name: a.name,
        purpose: a.purpose,
        // Every agent starts unable to act. Turning one on is a deliberate act
        // by an administrator, not a side effect of deploying.
        enabled: false,
        maxGate: "AUTO_WITH_AUDIT",
      },
    });
  }
  console.log(`[gmos] agent register: ${AGENT_KEYS.length} agents`);
}

async function seedAdmin() {
  const existing = await prisma.teamMember.findUnique({ where: { email: BOOTSTRAP_ADMIN.email } });
  if (existing) {
    console.log(`[gmos] bootstrap admin already present (${BOOTSTRAP_ADMIN.email})`);
    return existing.id;
  }
  const created = await prisma.teamMember.create({
    data: {
      email: BOOTSTRAP_ADMIN.email,
      name: BOOTSTRAP_ADMIN.name,
      role: BOOTSTRAP_ADMIN.role,
      approvalLevel: ROLE_DEFAULT_LEVEL[BOOTSTRAP_ADMIN.role],
      clearance: "PRIVILEGED",
      entityId: "ORG-ES",
      departmentId: "GOV",
      status: "ACTIVE",
    },
  });
  console.log(`[gmos] created bootstrap admin ${BOOTSTRAP_ADMIN.email}`);
  return created.id;
}

/**
 * Give everyone on the public business cards a portal account.
 *
 * They sign in with their mailbox password, so no credential is created here —
 * only the identity and the link back to their card. Role and clearance start
 * at the floor; raising either is an administrator's decision.
 */
async function seedFromWorkforce() {
  const people = await prisma.workforcePerson.findMany({
    where: { published: true },
    select: { id: true, name: true, email: true, branchSlugs: true, roleKey: true },
  });

  let created = 0;
  let linked = 0;

  for (const p of people) {
    const email = (p.email || "").trim().toLowerCase();
    if (!email) continue;

    const slugs = Array.isArray(p.branchSlugs) ? (p.branchSlugs as string[]) : [];
    const entityId = slugs.map((s) => BRANCH_TO_ENTITY[s]).find(Boolean) ?? null;

    const existing = await prisma.teamMember.findUnique({ where: { email } });
    if (existing) {
      // Link the card to the account if that has not been done, and fill in an
      // entity we can now derive. Nothing else is touched.
      if (!existing.personId) {
        await prisma.teamMember.update({
          where: { id: existing.id },
          data: { personId: p.id, entityId: existing.entityId ?? entityId },
        });
        linked++;
      }
      continue;
    }

    await prisma.teamMember.create({
      data: {
        email,
        name: p.name,
        personId: p.id,
        entityId,
        role: "EMPLOYEE",
        approvalLevel: ROLE_DEFAULT_LEVEL.EMPLOYEE,
        clearance: "INTERNAL",
        status: "ACTIVE",
      },
    });
    created++;
  }

  console.log(`[gmos] team members: ${created} created, ${linked} linked to an existing card`);
}

async function main() {
  await seedAgents();
  await seedAdmin();
  await seedFromWorkforce();

  const total = await prisma.teamMember.count();
  console.log(`[gmos] done — ${total} team members in total`);
}

main()
  .catch((e) => {
    console.error("[gmos] seed failed", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
