import { prisma } from "@app/db";
import { memberOr401 } from "@/lib/guard";
import { isGroupWide } from "@app/core";
import { packItemVerified } from "@/lib/notify";

export const dynamic = "force-dynamic";

/**
 * Verify, reject or waive a pack item.
 *
 * Verification is the control the whole pack exists for, so it is deliberately
 * a separate act by a separate person from the upload. Nobody verifies their
 * own document — that check comes before the permission check, so an executive
 * cannot wave through their own right-to-work evidence.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await memberOr401();
  if (!auth) return new Response(null, { status: 303, headers: { Location: "/" } });

  const { id } = await ctx.params;
  const url = new URL("/hr", req.url);
  const fail = (m: string) => {
    url.searchParams.set("error", m);
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  };

  const mayVerify = isGroupWide(auth.member.role) || auth.member.departmentId === "PEO";
  if (!mayVerify) return fail("Only People can verify document requirements.");

  const item = await prisma.employeeDocument.findUnique({
    where: { id },
    include: { member: { select: { id: true, name: true } } },
  });
  if (!item) return fail("No such requirement.");

  if (item.memberId === auth.member.id) {
    return fail("You cannot verify your own documents. Ask a colleague in People.");
  }

  const form = await req.formData();
  const action = String(form.get("action") || "");
  const note = String(form.get("note") || "").trim().slice(0, 300);
  const expiresAt = String(form.get("expiresAt") || "").trim();

  if (action === "verify") {
    if (item.status === "MISSING") return fail("Nothing has been supplied for that requirement yet.");
    await prisma.employeeDocument.update({
      where: { id },
      data: {
        status: "VERIFIED",
        verifiedAt: new Date(),
        verifiedById: auth.member.id,
        // A right-to-work document with an expiry that nobody records is one
        // that silently lapses.
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });
  } else if (action === "reject") {
    await prisma.employeeDocument.update({
      where: { id },
      data: { status: "MISSING", documentId: null, providedAt: null, verifiedAt: null, verifiedById: null },
    });
  } else if (action === "waive") {
    if (item.mandatory && !note) {
      // A waiver without a reason is indistinguishable from an oversight, and
      // this is the one place somebody sets aside a mandatory control.
      return fail("A mandatory requirement can only be waived with a reason.");
    }
    await prisma.employeeDocument.update({
      where: { id },
      data: { status: "WAIVED", waivedReason: note || null, verifiedById: auth.member.id, verifiedAt: new Date() },
    });
  } else {
    return fail("Unknown action.");
  }

  if (action === "verify" || action === "reject") {
    packItemVerified(item.memberId, item.name, action === "verify" ? "verified" : "rejected");
  }

  if (item.documentId) {
    await prisma.documentEvent.create({
      data: {
        documentId: item.documentId,
        actorKind: "HUMAN",
        actorRef: auth.member.id,
        actorName: auth.member.name,
        action: `pack_${action}`,
        note: `${item.code} for ${item.member.name}${note ? ` — ${note}` : ""}`,
      },
    });
  }

  url.searchParams.set("done", "1");
  return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
}
