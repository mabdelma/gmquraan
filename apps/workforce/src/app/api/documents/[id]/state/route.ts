import { prisma } from "@app/db";
import { memberOr401 } from "@/lib/guard";
import { mayActOnDocument, type DocRecord } from "@/lib/documents";
import { docTransitionProblem, memberCan, type DocState, type GmRole } from "@app/core";

export const dynamic = "force-dynamic";

/**
 * Move a controlled document through its lifecycle.
 *
 * Every guard the document lifecycle defines is applied by @app/core rather
 * than re-stated here: an approval needs a named approver and a locked version,
 * executed needs evidence, superseded needs a replacement, and disposal needs a
 * retention check that a legal hold overrides.
 *
 * The one rule that lives here is separation: nobody approves their own
 * document. The document controller's own permission entry lists
 * `approve_own_controlled_document` under `cannot`, and this is where that
 * becomes real.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await memberOr401();
  if (!auth) return new Response(null, { status: 303, headers: { Location: "/" } });

  const { id } = await ctx.params;
  const url = new URL(`/documents/${id}`, req.url);
  const fail = (m: string) => {
    url.searchParams.set("error", m);
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  };

  const doc = await prisma.controlledDocument.findUnique({ where: { id } });
  if (!doc) return fail("That record no longer exists.");

  const record = doc as unknown as DocRecord;
  if (!mayActOnDocument(auth.viewer, record, "edit").ok) return fail("You cannot change this record.");

  const form = await req.formData();
  const to = String(form.get("to") || "") as DocState;
  const note = String(form.get("note") || "").trim().slice(0, 300);

  const full = await prisma.teamMember.findUnique({
    where: { id: auth.member.id },
    select: { role: true, grantedCapabilities: true },
  });

  if (to === "APPROVED") {
    if (!memberCan({ role: full!.role as GmRole, grantedCapabilities: full!.grantedCapabilities }, "approve")) {
      return fail("Your role cannot approve controlled records.");
    }
    // Before the permission check would be wrong: somebody who cannot approve
    // at all should be told that, not told they own it.
    if (doc.ownerId === auth.member.id) {
      return fail("You cannot approve a record you own. Ask somebody else to review it.");
    }
  }

  const problem = docTransitionProblem(doc.state as DocState, to, {
    approverId: to === "APPROVED" ? auth.member.id : null,
    // Approving locks the version by definition — that is what approval means
    // here, and the check exists so it cannot be skipped by another path.
    versionLocked: true,
    evidence: doc.sha256 ? [doc.sha256] : null,
    supersedesId: doc.supersedesId,
    retainUntil: doc.retainUntil,
    legalHold: doc.legalHold,
    deletionAuthorisers: [],
  });
  if (problem) return fail(problem);

  // Approval moves 0.x to 1.0 — the convention the document control model
  // states: working revisions below one, approved versions at a whole number.
  const versioned =
    to === "APPROVED" ? { versionMajor: doc.versionMajor + 1, versionMinor: 0 } : {};

  await prisma.$transaction([
    prisma.controlledDocument.update({ where: { id }, data: { state: to, ...versioned } }),
    prisma.documentEvent.create({
      data: {
        documentId: id,
        actorKind: "HUMAN",
        actorRef: auth.member.id,
        actorName: auth.member.name,
        action: "state_changed",
        fromState: doc.state as DocState,
        toState: to,
        note: note || null,
      },
    }),
  ]);

  url.searchParams.set("done", "1");
  return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
}
