import { prisma } from "@app/db";
import { memberOr401 } from "@/lib/guard";
import { isGroupWide } from "@app/core";

export const dynamic = "force-dynamic";

/**
 * The asset register.
 *
 * Assignments are rows per period rather than a pointer on the asset, so
 * reissuing a laptop does not erase who had it before. That matters the day
 * somebody asks who held a device when something happened on it.
 */
export async function POST(req: Request) {
  const auth = await memberOr401();
  if (!auth) return new Response(null, { status: 303, headers: { Location: "/" } });

  const url = new URL("/assets", req.url);
  const fail = (m: string) => {
    url.searchParams.set("error", m);
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  };

  const mayManage = isGroupWide(auth.member.role) || ["PEO", "OPS", "FIN"].includes(auth.member.departmentId ?? "");
  if (!mayManage) return fail("Only People, Operations or Finance manage the asset register.");

  const form = await req.formData();
  const str = (k: string) => String(form.get(k) || "").trim();
  const action = str("action");

  if (action === "create") {
    const name = str("name");
    if (name.length < 2) return fail("Give the asset a name.");
    const count = await prisma.asset.count();
    await prisma.asset.create({
      data: {
        ref: `AST-${String(count + 1).padStart(5, "0")}`,
        name,
        category: str("category") || "OTHER",
        serialNumber: str("serialNumber") || null,
        entityId: str("entityId") || auth.member.entityId,
        valueMinor: str("value") ? Math.round(Number(str("value")) * 100) : null,
        currency: str("currency") || null,
        status: "IN_STOCK",
      },
    });
    url.searchParams.set("done", "1");
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  }

  if (action === "issue") {
    const assetId = str("assetId");
    const memberId = str("memberId");
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) return fail("No such asset.");
    if (asset.status === "ISSUED") return fail("That asset is already issued. Record its return first.");
    if (asset.status === "RETIRED" || asset.status === "LOST") {
      return fail(`That asset is ${asset.status.toLowerCase()} and cannot be issued.`);
    }
    const holder = await prisma.teamMember.findUnique({ where: { id: memberId }, select: { status: true } });
    if (!holder) return fail("No such person.");
    if (holder.status !== "ACTIVE") return fail("That person is not active.");

    await prisma.$transaction([
      prisma.assetAssignment.create({
        data: { assetId, memberId, issuedById: auth.member.id, note: str("note") || null },
      }),
      prisma.asset.update({ where: { id: assetId }, data: { status: "ISSUED" } }),
    ]);
    url.searchParams.set("done", "1");
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  }

  if (action === "return") {
    const assignmentId = str("assignmentId");
    const a = await prisma.assetAssignment.findUnique({ where: { id: assignmentId } });
    if (!a) return fail("No such assignment.");
    if (a.returnedAt) return fail("That was already returned.");

    const condition = str("condition") || "OK";
    await prisma.$transaction([
      prisma.assetAssignment.update({
        where: { id: assignmentId },
        data: { returnedAt: new Date(), returnedToId: auth.member.id, condition },
      }),
      prisma.asset.update({
        where: { id: a.assetId },
        // A device returned broken or missing does not go back in the pool as
        // though it were fine.
        data: { status: condition === "LOST" ? "LOST" : condition === "DAMAGED" ? "IN_REPAIR" : "IN_STOCK" },
      }),
    ]);
    url.searchParams.set("done", "1");
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  }

  return fail("Unknown action.");
}
