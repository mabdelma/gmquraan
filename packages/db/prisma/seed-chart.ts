import { PrismaClient } from "@prisma/client";

/**
 * A starter chart of accounts.
 *
 * **This is a starting point, not accounting advice.** It is the conventional
 * skeleton — assets 1, liabilities 2, equity 3, income 4, expenses 5–6 — with
 * the handful of accounts AR, AP and banking need in order to post at all. It
 * is deliberately small: a long invented chart is harder to correct than an
 * empty one, and every business needs different detail.
 *
 * Everything here is editable and deletable in the portal. Nothing in the
 * domain layer refers to these codes; they are reference data, per the
 * specification's requirement that seed values stay configurable.
 *
 * Idempotent on (companyId, code). Existing accounts are never overwritten, so
 * running it again cannot revert a name somebody corrected.
 *
 *   npm --workspace @app/db run seed:chart
 */
const prisma = new PrismaClient();

type Row = { code: string; name: string; type: string; postable?: boolean };

const CHART: Row[] = [
  { code: "1000", name: "Assets", type: "ASSET", postable: false },
  { code: "1100", name: "Bank", type: "ASSET" },
  { code: "1150", name: "Cash", type: "ASSET" },
  { code: "1200", name: "Trade debtors", type: "ASSET" },
  { code: "1300", name: "Prepayments", type: "ASSET" },

  { code: "2000", name: "Liabilities", type: "LIABILITY", postable: false },
  { code: "2100", name: "Trade creditors", type: "LIABILITY" },
  { code: "2200", name: "Tax payable", type: "LIABILITY" },
  { code: "2300", name: "Accruals", type: "LIABILITY" },
  { code: "2400", name: "Payroll payable", type: "LIABILITY" },

  { code: "3000", name: "Equity", type: "EQUITY", postable: false },
  { code: "3100", name: "Share capital", type: "EQUITY" },
  { code: "3200", name: "Retained earnings", type: "EQUITY" },

  { code: "4000", name: "Income", type: "INCOME", postable: false },
  { code: "4100", name: "Services", type: "INCOME" },
  { code: "4200", name: "Products", type: "INCOME" },

  { code: "5000", name: "Cost of sales", type: "EXPENSE", postable: false },
  { code: "5100", name: "Direct costs", type: "EXPENSE" },
  { code: "5200", name: "Subcontractors", type: "EXPENSE" },

  { code: "6000", name: "Operating expenses", type: "EXPENSE", postable: false },
  { code: "6100", name: "Staff costs", type: "EXPENSE" },
  { code: "6200", name: "Premises", type: "EXPENSE" },
  { code: "6300", name: "Professional fees", type: "EXPENSE" },
  { code: "6400", name: "Software and services", type: "EXPENSE" },
  { code: "6900", name: "Other operating costs", type: "EXPENSE" },
];

async function main() {
  const only = process.argv[2];
  const companies = await prisma.company.findMany({
    where: only ? { code: only } : {},
    select: { code: true, legalName: true },
    orderBy: { code: "asc" },
  });

  if (!companies.length) {
    console.error("No companies found. Seed companies first.");
    process.exit(1);
  }

  for (const c of companies) {
    let created = 0;
    let left = 0;
    for (const row of CHART) {
      const existing = await prisma.ledgerAccount.findUnique({
        where: { companyId_code: { companyId: c.code, code: row.code } },
      });
      if (existing) {
        left++;
        continue;
      }
      await prisma.ledgerAccount.create({
        data: {
          companyId: c.code,
          code: row.code,
          name: row.name,
          type: row.type,
          postable: row.postable ?? true,
        },
      });
      created++;
    }
    console.log(`  ${c.code.padEnd(9)} ${String(created).padStart(2)} created, ${String(left).padStart(2)} already there  — ${c.legalName}`);
  }

  console.log("\nA starting point, not accounting advice. Edit or delete freely.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
