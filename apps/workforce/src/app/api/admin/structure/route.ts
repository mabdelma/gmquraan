import { prisma } from "@app/db";
import { memberOr401 } from "@/lib/guard";
import {
  APPROVAL_LEVELS,
  DEPARTMENT_IDS,
  ENTITY_IDS,
  GM_ROLES,
  ORG_TIERS,
  ROLE_TIER,
  TIERS,
  approvalLevelFor,
  canReportTo,
  isLateralTier,
  memberCan,
  positionCode,
  type ApprovalLevel,
  type GmRole,
  type OrgTier,
} from "@app/core";

export const dynamic = "force-dynamic";

/**
 * Edit the organisation structure itself — the seats, not who sits in them.
 *
 * Guarded rather than free-form. The structure is what the access rules read
 * from, so a seat that reports sideways or a cycle in the tree would quietly
 * change who can see whose work. Every constraint the org module enforces when
 * generating the default structure is re-checked here.
 */
export async function POST(req: Request) {
  const auth = await memberOr401();
  if (!auth) return new Response(null, { status: 303, headers: { Location: "/" } });

  const url = new URL("/admin/structure", req.url);
  const fail = (m: string) => {
    url.searchParams.set("error", m);
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  };

  // Changing the shape of the organisation is administration, not management.
  const full = await prisma.teamMember.findUnique({
    where: { id: auth.member.id },
    select: { role: true, grantedCapabilities: true },
  });
  if (!full || !memberCan({ role: full.role as GmRole, grantedCapabilities: full.grantedCapabilities }, "administer")) {
    return fail("Changing the organisation structure needs the administer capability.");
  }

  const form = await req.formData();
  const str = (k: string) => String(form.get(k) || "").trim();
  const action = str("action");

  if (action === "delete") {
    const seat = await prisma.orgPosition.findUnique({
      where: { id: str("positionId") },
      include: { holder: { select: { name: true } }, children: { select: { id: true } } },
    });
    if (!seat) return fail("No such seat.");
    if (seat.holder) return fail(`${seat.code} is held by ${seat.holder.name}. Move them first.`);
    if (seat.children.length) {
      // Deleting a parent would orphan its children, and buildTree reports
      // orphans rather than silently reparenting them — so the chart would
      // show a hole instead of a structure.
      return fail(`${seat.code} has ${seat.children.length} seat(s) reporting to it. Reassign them first.`);
    }
    await prisma.orgPosition.delete({ where: { id: seat.id } });
    url.searchParams.set("done", "1");
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  }

  const tier = str("tier") as OrgTier;
  if (!(ORG_TIERS as readonly string[]).includes(tier)) return fail("Unknown tier.");

  const role = str("role") as GmRole;
  if (!GM_ROLES.includes(role)) return fail("Unknown role.");
  if (!TIERS[tier].roles.includes(role)) {
    return fail(`A ${TIERS[tier].name} seat cannot be held with the role ${role}.`);
  }
  if (ROLE_TIER[role] !== tier) {
    return fail(`${role} belongs to the ${TIERS[ROLE_TIER[role]].name} tier.`);
  }

  const title = str("title");
  if (!title) return fail("Give the seat a title.");

  const entityId = str("entityId") || null;
  if (entityId && !(ENTITY_IDS as readonly string[]).includes(entityId)) return fail("Unknown branch.");
  const departmentId = str("departmentId") || null;
  if (departmentId && !(DEPARTMENT_IDS as readonly string[]).includes(departmentId)) {
    return fail("Unknown department.");
  }
  if (TIERS[tier].scope === "entity" && !entityId) {
    return fail(`${TIERS[tier].name} is an entity-scoped seat and needs a branch.`);
  }

  const approvalLevel = (str("approvalLevel") || approvalLevelFor(tier)) as ApprovalLevel;
  if (!APPROVAL_LEVELS.includes(approvalLevel)) return fail("Unknown approval level.");
  if (isLateralTier(tier) && approvalLevel !== "A0") {
    return fail(`${TIERS[tier].name} sits beside the chain of command and cannot hold ${approvalLevel}.`);
  }

  // Parent.
  const parentId = str("parentId") || null;
  let parent: { id: string; tier: string; code: string } | null = null;
  if (parentId) {
    const p = await prisma.orgPosition.findUnique({ where: { id: parentId } });
    if (!p) return fail("No such parent seat.");
    const check = canReportTo(tier, p.tier as OrgTier);
    if (!check.ok) return fail(check.reason ?? "That reporting line is not allowed.");
    parent = { id: p.id, tier: p.tier, code: p.code };
  } else if (!isLateralTier(tier) && tier !== "BOARD") {
    return fail("Every seat except the board reports to another seat.");
  }

  if (action === "create") {
    const code = positionCode({ entityId, departmentId, tier });
    const clash = await prisma.orgPosition.findUnique({ where: { code } });
    if (clash) return fail(`A seat with the code ${code} already exists.`);

    await prisma.orgPosition.create({
      data: { code, tier, role, title, entityId, departmentId, approvalLevel, parentId: parent?.id ?? null },
    });
    url.searchParams.set("done", "1");
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  }

  if (action === "update") {
    const id = str("positionId");
    const seat = await prisma.orgPosition.findUnique({ where: { id } });
    if (!seat) return fail("No such seat.");

    // Walk up from the proposed parent. Meeting this seat means the edge would
    // close a loop, and a cycle makes every transitive report walk meaningless
    // for everybody inside it.
    let cursor = parent?.id ?? null;
    for (let i = 0; i < 20 && cursor; i++) {
      if (cursor === id) return fail("That would make the structure circular.");
      const up: { parentId: string | null } | null = await prisma.orgPosition.findUnique({
        where: { id: cursor },
        select: { parentId: true },
      });
      cursor = up?.parentId ?? null;
    }

    await prisma.orgPosition.update({
      where: { id },
      data: { tier, role, title, entityId, departmentId, approvalLevel, parentId: parent?.id ?? null },
    });
    url.searchParams.set("done", "1");
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  }

  return fail("Unknown action.");
}
