import { Prisma, prisma } from "@app/db";
import { recordAudit } from "./audit";
import {
  accountCodeProblem,
  amendmentProblem,
  entryTotals,
  isGroupWide,
  money,
  periodCloseProblem,
  periodOf,
  postingProblem,
  reversalOf,
  toDecimalString,
  zero,
  type Account,
  type GmRole,
  type JournalEntry,
  type Money,
} from "@app/core";

/**
 * The ledger service (FIN-01).
 *
 * Every rule lives in `@app/core` and is tested without a database. This layer
 * loads what those rules need, calls them, and writes the result in one
 * transaction. It re-implements none of them — a service that re-checked the
 * balance would be a second opinion able to disagree with the tested one.
 *
 * Money crosses the boundary as a decimal string, never a number. Prisma
 * returns `Decimal`, and `Number()` on one of those is the defect this whole
 * design exists to prevent.
 */

/** Who may keep the books. */
export function mayKeepLedger(m: { role: GmRole; departmentId?: string | null }): boolean {
  return isGroupWide(m.role) || m.departmentId === "FIN";
}

const toMoney = (d: Prisma.Decimal | null | undefined, currency: string): Money =>
  money(d ? d.toFixed(4) : "0", currency);

/** The chart of accounts a company may post to. */
export async function chartOfAccounts(companyId: string): Promise<Account[]> {
  const rows = await prisma.ledgerAccount.findMany({
    where: { companyId },
    orderBy: { code: "asc" },
  });
  return rows.map((r) => ({
    code: r.code,
    name: r.name,
    type: r.type as Account["type"],
    parentCode: r.parentCode,
    postable: r.postable,
    active: r.active,
    companyId: r.companyId,
    currency: r.currency,
  }));
}

export async function createAccount(input: {
  companyId: string;
  code: string;
  name: string;
  type: string;
  postable: boolean;
  currency?: string | null;
  parentCode?: string | null;
  actor: { id: string; name?: string | null };
}) {
  const problem = accountCodeProblem(input.code);
  if (problem) return { ok: false as const, error: problem };
  if (!input.name.trim()) return { ok: false as const, error: "Give the account a name." };

  const clash = await prisma.ledgerAccount.findUnique({
    where: { companyId_code: { companyId: input.companyId, code: input.code } },
  });
  if (clash) return { ok: false as const, error: `${input.code} already exists in this company.` };

  const created = await prisma.ledgerAccount.create({
    data: {
      companyId: input.companyId,
      code: input.code.trim(),
      name: input.name.trim(),
      type: input.type,
      postable: input.postable,
      currency: input.currency || null,
      parentCode: input.parentCode || null,
    },
  });

  await recordAudit({
    action: "fin.account.create",
    actorKind: "HUMAN",
    actorId: input.actor.id,
    actorName: input.actor.name,
    entityType: "LedgerAccount",
    entityRef: `${input.companyId}/${created.code}`,
    companyId: input.companyId,
    after: { code: created.code, name: created.name, type: created.type, postable: created.postable },
  });

  return { ok: true as const, account: created };
}

export type DraftLine = {
  accountCode: string;
  debit: string;
  credit: string;
  description?: string | null;
  projectId?: string | null;
};

/**
 * Create and post a journal entry in one transaction.
 *
 * Draft-then-post exists in the schema, but nothing here writes a half-entry:
 * the balance check runs before anything is inserted, so an unbalanced entry
 * never reaches the database at all. A draft that cannot balance is a draft
 * somebody has to clean up later.
 */
export async function postJournal(input: {
  companyId: string;
  currency: string;
  date: string;
  reference: string;
  memo?: string | null;
  lines: DraftLine[];
  actor: { id: string; name?: string | null };
}) {
  const currency = input.currency;
  let parsed: JournalEntry;
  try {
    parsed = {
      companyId: input.companyId,
      date: input.date,
      currency,
      memo: input.memo ?? null,
      lines: input.lines.map((l) => ({
        accountCode: l.accountCode.trim(),
        debit: l.debit.trim() ? money(l.debit.trim(), currency) : zero(currency),
        credit: l.credit.trim() ? money(l.credit.trim(), currency) : zero(currency),
        description: l.description ?? null,
        projectId: l.projectId ?? null,
      })),
    };
  } catch (e) {
    // A malformed amount is reported as itself rather than becoming a
    // mysterious imbalance three steps later.
    return { ok: false as const, error: e instanceof Error ? e.message : "That amount is not a decimal." };
  }

  const period = periodOf(input.date);
  const [accounts, periodRow] = await Promise.all([
    chartOfAccounts(input.companyId),
    prisma.accountingPeriod.findUnique({
      where: { companyId_period: { companyId: input.companyId, period } },
    }),
  ]);

  const problem = postingProblem(parsed, {
    accounts,
    period: periodRow ? { period: periodRow.period, status: periodRow.status as never } : null,
  });
  if (problem) return { ok: false as const, error: problem };

  const totals = entryTotals(parsed);
  const byCode = new Map(
    (await prisma.ledgerAccount.findMany({ where: { companyId: input.companyId } })).map((a) => [a.code, a.id])
  );

  const entry = await prisma.$transaction(async (tx) => {
    const created = await tx.journalEntry.create({
      data: {
        companyId: input.companyId,
        reference: input.reference.trim(),
        date: new Date(input.date),
        period,
        currency,
        state: "POSTED",
        memo: input.memo ?? null,
        totalDebit: new Prisma.Decimal(toDecimalString(totals.debits)),
        totalCredit: new Prisma.Decimal(toDecimalString(totals.credits)),
        postedAt: new Date(),
        postedById: input.actor.id,
        createdById: input.actor.id,
        lines: {
          create: parsed.lines.map((l) => ({
            accountId: byCode.get(l.accountCode)!,
            debit: new Prisma.Decimal(toDecimalString(l.debit)),
            credit: new Prisma.Decimal(toDecimalString(l.credit)),
            description: l.description,
            projectId: l.projectId,
          })),
        },
      },
    });
    return created;
  });

  await recordAudit({
    action: "fin.journal.post",
    actorKind: "HUMAN",
    actorId: input.actor.id,
    actorName: input.actor.name,
    entityType: "JournalEntry",
    entityRef: entry.reference,
    companyId: input.companyId,
    after: {
      period,
      currency,
      totalDebit: toDecimalString(totals.debits),
      lines: parsed.lines.length,
    },
    note: input.memo ?? null,
  });

  return { ok: true as const, entry };
}

/**
 * Reverse a posted entry.
 *
 * The only correction there is. `amendmentProblem` is the message anything
 * attempting an edit gets, and it is deliberately the same wording everywhere
 * so the rule reads as a rule rather than as one screen's opinion.
 */
export async function reverseJournal(input: {
  entryId: string;
  on: string;
  reference: string;
  actor: { id: string; name?: string | null };
}) {
  const row = await prisma.journalEntry.findUnique({
    where: { id: input.entryId },
    include: { lines: { include: { account: true } }, reversedBy: true },
  });
  if (!row) return { ok: false as const, error: "That entry no longer exists." };
  if (row.state !== "POSTED") return { ok: false as const, error: `Only a posted entry can be reversed; this one is ${row.state.toLowerCase()}.` };
  if (row.reversedBy) return { ok: false as const, error: "That entry has already been reversed." };

  const original: JournalEntry & { id: string } = {
    id: row.id,
    companyId: row.companyId,
    date: row.date,
    currency: row.currency,
    memo: row.memo,
    lines: row.lines.map((l) => ({
      accountCode: l.account.code,
      debit: toMoney(l.debit, row.currency),
      credit: toMoney(l.credit, row.currency),
      description: l.description,
      projectId: l.projectId,
    })),
  };

  const reversal = reversalOf(original, input.on);
  const posted = await postJournal({
    companyId: row.companyId,
    currency: row.currency,
    date: input.on,
    reference: input.reference,
    memo: reversal.memo,
    lines: reversal.lines.map((l) => ({
      accountCode: l.accountCode,
      debit: toDecimalString(l.debit),
      credit: toDecimalString(l.credit),
      description: l.description,
      projectId: l.projectId,
    })),
    actor: input.actor,
  });
  if (!posted.ok) return posted;

  await prisma.$transaction([
    prisma.journalEntry.update({
      where: { id: posted.entry.id },
      data: { reversesEntryId: row.id },
    }),
    prisma.journalEntry.update({ where: { id: row.id }, data: { state: "REVERSED" } }),
  ]);

  await recordAudit({
    action: "fin.journal.reverse",
    actorKind: "HUMAN",
    actorId: input.actor.id,
    actorName: input.actor.name,
    entityType: "JournalEntry",
    entityRef: row.reference,
    companyId: row.companyId,
    before: { state: "POSTED" },
    after: { state: "REVERSED", reversedBy: posted.entry.reference },
  });

  return { ok: true as const, entry: posted.entry };
}

/** The message anything attempting to edit a posted entry receives. */
export const editRefusal = amendmentProblem;

/** Close a period, once nothing is left open in it. */
export async function closePeriod(input: {
  companyId: string;
  period: string;
  actor: { id: string; name?: string | null };
}) {
  const row =
    (await prisma.accountingPeriod.findUnique({
      where: { companyId_period: { companyId: input.companyId, period: input.period } },
    })) ??
    (await prisma.accountingPeriod.create({
      data: { companyId: input.companyId, period: input.period, status: "OPEN" },
    }));

  const drafts = await prisma.journalEntry.count({
    where: { companyId: input.companyId, period: input.period, state: "DRAFT" },
  });

  const problem = periodCloseProblem({
    period: { period: row.period, status: row.status as never },
    draftEntries: drafts,
    unbalanced: 0,
  });
  if (problem) return { ok: false as const, error: problem };

  await prisma.accountingPeriod.update({
    where: { id: row.id },
    data: { status: "CLOSED", closedAt: new Date(), closedById: input.actor.id },
  });

  await recordAudit({
    action: "fin.period.close",
    actorKind: "HUMAN",
    actorId: input.actor.id,
    actorName: input.actor.name,
    entityType: "AccountingPeriod",
    entityRef: `${input.companyId}/${input.period}`,
    companyId: input.companyId,
    before: { status: "OPEN" },
    after: { status: "CLOSED" },
  });

  return { ok: true as const };
}
