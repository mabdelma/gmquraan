import { prisma } from "@app/db";
import { memberOr401 } from "@/lib/guard";
import { isGroupWide } from "@app/core";

export const dynamic = "force-dynamic";

/**
 * Training and certification.
 *
 * People record their own; People may record for anybody. A certification
 * without an expiry is accepted but flagged, because the whole reason to track
 * these is to notice one lapsing before somebody relies on it.
 */
export async function POST(req: Request) {
  const auth = await memberOr401();
  if (!auth) return new Response(null, { status: 303, headers: { Location: "/" } });

  const form = await req.formData();
  const memberId = String(form.get("memberId") || auth.member.id);
  const back = memberId === auth.member.id ? "/me" : "/hr";
  const url = new URL(back, req.url);
  const fail = (m: string) => {
    url.searchParams.set("error", m);
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  };

  const isHr = isGroupWide(auth.member.role) || auth.member.departmentId === "PEO";
  if (memberId !== auth.member.id && !isHr) {
    return fail("You can only record your own training.");
  }

  const action = String(form.get("action") || "add");

  if (action === "complete") {
    const id = String(form.get("id") || "");
    const row = await prisma.trainingRecord.findUnique({ where: { id } });
    if (!row) return fail("No such record.");
    if (row.memberId !== auth.member.id && !isHr) return fail("That is not yours to change.");
    await prisma.trainingRecord.update({
      where: { id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    url.searchParams.set("done", "1");
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  }

  const title = String(form.get("title") || "").trim().slice(0, 200);
  if (title.length < 3) return fail("Give the training a title.");

  const expires = String(form.get("expiresAt") || "");
  await prisma.trainingRecord.create({
    data: {
      memberId,
      title,
      provider: String(form.get("provider") || "").trim().slice(0, 200) || null,
      kind: String(form.get("kind") || "COURSE"),
      mandatory: String(form.get("mandatory") || "") === "1",
      status: String(form.get("status") || "PLANNED"),
      expiresAt: expires ? new Date(expires) : null,
      note: String(form.get("note") || "").trim().slice(0, 300) || null,
    },
  });

  url.searchParams.set("done", "1");
  return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
}
