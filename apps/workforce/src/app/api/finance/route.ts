import { memberOr401 } from "@/lib/guard";
import { closePeriod, createAccount, mayKeepLedger, postJournal, reverseJournal } from "@/lib/ledger";
import type { DraftLine } from "@/lib/ledger";

export const dynamic = "force-dynamic";

/**
 * Finance actions (FIN-01).
 *
 * Thin on purpose. Balance, period locks, account validity and immutability all
 * live in the domain and the service; a route that re-checked any of them would
 * be a second opinion able to disagree with the tested one.
 *
 * The company is taken from the member's own scope, never from the form. A
 * companyId in a request body is an invitation to post into somebody else's
 * books.
 */
export async function POST(req: Request) {
  const auth = await memberOr401();
  if (!auth) return new Response(null, { status: 303, headers: { Location: "/" } });

  const form = await req.formData();
  const action = String(form.get("action") || "");

  const to = (params: Record<string, string>) =>
    new Response(null, {
      status: 303,
      headers: { Location: `/finance?${new URLSearchParams(params)}` },
    });
  const fail = (m: string) => to({ error: m });

  if (!mayKeepLedger(auth.member)) {
    return fail("Only finance and group-wide roles can keep the ledger.");
  }

  const companyId = auth.member.entityId;
  if (!companyId) return fail("Your account is not attached to a company, so there are no books to post to.");

  const actor = { id: auth.member.id, name: auth.member.name };

  if (action === "create-account") {
    const r = await createAccount({
      companyId,
      code: String(form.get("code") || ""),
      name: String(form.get("name") || ""),
      type: String(form.get("type") || "ASSET"),
      postable: String(form.get("postable") || "on") === "on",
      currency: String(form.get("currency") || "").trim() || null,
      actor,
    });
    return r.ok ? to({ done: `Added ${r.account.code} ${r.account.name}.` }) : fail(r.error);
  }

  if (action === "post-journal") {
    // Lines arrive as parallel arrays from the form.
    const codes = form.getAll("lineAccount").map(String);
    const debits = form.getAll("lineDebit").map(String);
    const credits = form.getAll("lineCredit").map(String);
    const notes = form.getAll("lineDescription").map(String);

    const lines: DraftLine[] = codes
      .map((accountCode, i) => ({
        accountCode,
        debit: debits[i] ?? "",
        credit: credits[i] ?? "",
        description: notes[i] || null,
      }))
      // A blank row is somebody not using the third line, not an error.
      .filter((l) => l.accountCode.trim() && (l.debit.trim() || l.credit.trim()));

    const r = await postJournal({
      companyId,
      currency: String(form.get("currency") || "EUR"),
      date: String(form.get("date") || ""),
      reference: String(form.get("reference") || ""),
      memo: String(form.get("memo") || "").trim() || null,
      lines,
      actor,
    });
    return r.ok ? to({ done: `Posted ${r.entry.reference}.` }) : fail(r.error);
  }

  if (action === "reverse-journal") {
    const r = await reverseJournal({
      entryId: String(form.get("entryId") || ""),
      on: String(form.get("on") || new Date().toISOString().slice(0, 10)),
      reference: String(form.get("reference") || ""),
      actor,
    });
    return r.ok ? to({ done: `Reversed with ${r.entry.reference}.` }) : fail(r.error);
  }

  if (action === "close-period") {
    const r = await closePeriod({ companyId, period: String(form.get("period") || ""), actor });
    return r.ok ? to({ done: `Period closed.` }) : fail(r.error);
  }

  return fail("Unknown action.");
}
