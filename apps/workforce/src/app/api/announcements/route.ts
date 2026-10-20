import { prisma } from "@app/db";
import { memberOr401 } from "@/lib/guard";
import { DEPARTMENT_IDS, ENTITY_IDS, isGroupWide } from "@app/core";

export const dynamic = "force-dynamic";

/**
 * Post or withdraw an announcement.
 *
 * The table has existed since the schema went in and nothing could write to it,
 * so "what's new" on the home page was permanently empty. This is that gap.
 *
 * Audience is validated against the real entity and department lists rather
 * than accepted as typed — an announcement addressed to a department that does
 * not exist reaches nobody and looks like it was sent.
 */
export async function POST(req: Request) {
  const auth = await memberOr401();
  if (!auth) return new Response(null, { status: 303, headers: { Location: "/" } });

  const url = new URL("/home", req.url);
  const fail = (m: string) => {
    url.searchParams.set("error", m);
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  };

  const form = await req.formData();
  const action = String(form.get("action") || "post");

  if (action === "withdraw") {
    const id = String(form.get("id") || "");
    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) return fail("That announcement no longer exists.");
    // The author or a group-wide role. A manager should not be able to remove
    // somebody else's notice from under them.
    if (existing.authorId !== auth.member.id && !isGroupWide(auth.member.role)) {
      return fail("Only the author can withdraw that.");
    }
    await prisma.announcement.update({ where: { id }, data: { expiresAt: new Date() } });
    url.searchParams.set("done", "Withdrawn.");
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  }

  // Posting to everybody is a group-wide act; a manager may address their own
  // branch or department.
  const audience = String(form.get("audience") || "ALL").trim();
  const valid =
    audience === "ALL" ||
    (ENTITY_IDS as readonly string[]).includes(audience) ||
    (DEPARTMENT_IDS as readonly string[]).includes(audience);
  if (!valid) return fail("That audience does not exist.");

  if (audience === "ALL" && !isGroupWide(auth.member.role)) {
    return fail("Only a group-wide role can address everybody. Choose your branch or department.");
  }
  if (!isGroupWide(auth.member.role) && audience !== auth.member.entityId && audience !== auth.member.departmentId) {
    return fail("You can only address your own branch or department.");
  }

  const title = String(form.get("title") || "").trim().slice(0, 200);
  const body = String(form.get("body") || "").trim().slice(0, 4000);
  if (title.length < 3) return fail("Give the announcement a title.");
  if (!body) return fail("Write something in the body.");

  const days = Number(form.get("days") || 14);
  await prisma.announcement.create({
    data: {
      title,
      body,
      audience,
      pinned: String(form.get("pinned") || "") === "1",
      authorId: auth.member.id,
      // Everything expires. A notice board nobody prunes stops being read, and
      // the oldest item is usually the one still shouting loudest.
      expiresAt: new Date(Date.now() + Math.min(Math.max(days, 1), 90) * 86_400_000),
    },
  });

  url.searchParams.set("done", "Posted.");
  return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
}
