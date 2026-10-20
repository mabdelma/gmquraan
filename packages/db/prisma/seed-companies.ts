import { PrismaClient } from "@prisma/client";
import { ENTITIES, ENTITY_IDS } from "@app/core";

/**
 * Promote the `ENTITIES` constant to Company rows (ORG-01, Wave 1.1).
 *
 * Idempotent by `code`, which is the natural key and the same string already
 * written onto every record as `entityId`. Running it twice changes nothing;
 * running it after somebody has edited a company in the portal does not
 * overwrite their edit, because the seed only fills what is missing.
 *
 * That last part matters. A seed that upserts every field would quietly revert
 * a legal name somebody corrected on screen, and the correction would be the
 * thing that was right.
 *
 *   npm --workspace @app/db run seed:companies
 */
const prisma = new PrismaClient();

/** The constant's `status` vocabulary is not the model's. Map, do not guess. */
const STATUS: Record<string, string> = {
  active: "ACTIVE",
  planned_or_active: "PLANNED",
  operating_location: "OPERATING_LOCATION",
};

async function main() {
  let created = 0;
  let left = 0;

  for (const code of ENTITY_IDS) {
    const e = ENTITIES[code];
    const existing = await prisma.company.findUnique({ where: { code } });

    if (existing) {
      left++;
      console.log(`  = ${code.padEnd(8)} already present — left as it is`);
      continue;
    }

    await prisma.company.create({
      data: {
        code,
        legalName: e.legalName,
        country: e.country,
        baseCurrency: e.currency,
        status: STATUS[e.status] ?? "ACTIVE",
      },
    });
    created++;
    console.log(`  + ${code.padEnd(8)} ${e.legalName} (${e.currency}, ${STATUS[e.status] ?? "ACTIVE"})`);
  }

  // How many records each company already carries. Not changed here — reported,
  // because it is what makes the code and currency immutable from now on.
  console.log("");
  for (const code of ENTITY_IDS) {
    const n = await prisma.teamMember.count({ where: { entityId: code } });
    if (n) console.log(`  ${code.padEnd(8)} ${n} team member(s) already scoped to it`);
  }

  console.log(`\n${created} created, ${left} left unchanged.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
