import { prisma } from "@app/db";

/** Partner-org (team) helpers. Access is always ADDITIVE to a user's own ownerId
 *  scope, so a partner with no team behaves exactly as before. */

/** IDs of every Partner org the user belongs to (as owner or member). */
export async function getMyOrgIds(userId: string): Promise<string[]> {
  const members = await prisma.partnerMember.findMany({ where: { userId }, select: { partnerId: true } });
  return members.map((m) => m.partnerId);
}

/** The user's primary org (first one they belong to) with members, or null. */
export async function getMyOrg(userId: string) {
  return prisma.partner.findFirst({
    where: { members: { some: { userId } } },
    include: {
      members: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, email: true, name: true } } }
      }
    }
  });
}

/** Is the user an ADMIN (or owner) of the org? */
export async function isOrgAdmin(userId: string, partnerId: string): Promise<boolean> {
  const org = await prisma.partner.findUnique({ where: { id: partnerId }, select: { ownerId: true } });
  if (org?.ownerId === userId) return true;
  const m = await prisma.partnerMember.findUnique({ where: { partnerId_userId: { partnerId, userId } }, select: { role: true } });
  return m?.role === "ADMIN";
}

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "team";
}

/** Create a team for the user (idempotent-ish: returns their existing org if any). */
export async function createOrgForUser(userId: string, name: string) {
  const existing = await getMyOrg(userId);
  if (existing) return existing;
  let slug = slugify(name);
  if (await prisma.partner.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  const org = await prisma.partner.create({
    data: {
      name: name.slice(0, 120),
      slug,
      ownerId: userId,
      members: { create: { userId, role: "ADMIN" } }
    }
  });
  return org;
}
