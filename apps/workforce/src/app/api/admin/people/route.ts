import { prisma } from "@app/db";
import { memberOr401 } from "@/lib/guard";
import {
  APPROVAL_LEVELS,
  CONFIDENTIALITY,
  DEPARTMENT_IDS,
  ENTITY_IDS,
  GM_ROLES,
  ROLE_TIER,
  TIERS,
  canReportTo,
  isGroupWide,
  placementProblem,
  requiredDocumentsForRole,
  type ApprovalLevel,
  type Confidentiality,
  type GmRole,
} from "@app/core";

export const dynamic = "force-dynamic";

/**
 * Place somebody in the organisation.
 *
 * Every field is validated against the controlled lists rather than trusted,
 * and the structural rules are re-checked here: a seat must match the role
 * being given, and a reporting line must go upward. The form cannot express an
 * illegal placement, but the form is not the control.
 */
export async function POST(req: Request) {
  const auth = await memberOr401();
  if (!auth) return new Response(null, { status: 303, headers: { Location: "/" } });

  const url = new URL("/admin/people", req.url);
  const fail = (m: string) => {
    url.searchParams.set("error", m);
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  };

  const mayEdit = isGroupWide(auth.member.role) || auth.member.departmentId === "PEO";
  if (!mayEdit) return fail("You cannot change placements.");

  const form = await req.formData();
  const str = (k: string) => String(form.get(k) || "").trim();

  const memberId = str("memberId");
  const subject = await prisma.teamMember.findUnique({
    where: { id: memberId },
    include: { employeeRecord: true },
  });
  if (!subject) return fail("No such person.");

  const role = str("role") as GmRole;
  if (!GM_ROLES.includes(role)) return fail("Unknown role.");

  const approvalLevel = str("approvalLevel") as ApprovalLevel;
  if (!APPROVAL_LEVELS.includes(approvalLevel)) return fail("Unknown approval level.");

  const clearance = str("clearance") as Confidentiality;
  if (!CONFIDENTIALITY.includes(clearance)) return fail("Unknown clearance.");

  const entityId = str("entityId");
  if (entityId && !(ENTITY_IDS as readonly string[]).includes(entityId)) return fail("Unknown branch.");

  const departmentId = str("departmentId");
  if (departmentId && !(DEPARTMENT_IDS as readonly string[]).includes(departmentId)) {
    return fail("Unknown department.");
  }

  const tier = ROLE_TIER[role];

  // A lateral identity cannot be handed business approval authority, whatever
  // the form said. This is the separation that keeps an infrastructure
  // administrator out of the payment chain.
  if (!TIERS[tier].canHaveReports && approvalLevel !== "A0") {
    return fail(`${TIERS[tier].name} sits beside the chain of command and cannot hold ${approvalLevel}.`);
  }

  // Seat.
  const positionId = str("positionId");
  let seatUpdate: string | null = null;
  if (positionId) {
    const seat = await prisma.orgPosition.findUnique({ where: { id: positionId }, include: { holder: true } });
    if (!seat) return fail("No such seat.");
    if (seat.holder && seat.holder.id !== subject.id) {
      return fail(`${seat.code} is already held by ${seat.holder.name}.`);
    }
    const problem = placementProblem({ role, entityId: entityId || null }, {
      tier: seat.tier as never,
      role: seat.role as GmRole,
      entityId: seat.entityId,
    });
    if (problem) return fail(problem);
    seatUpdate = seat.id;
  }

  // Reporting line.
  const managerId = str("managerId");
  if (managerId) {
    if (managerId === subject.id) return fail("Nobody reports to themselves.");
    const manager = await prisma.teamMember.findUnique({
      where: { id: managerId },
      select: { id: true, role: true, managerId: true },
    });
    if (!manager) return fail("No such manager.");

    const check = canReportTo(tier, ROLE_TIER[manager.role as GmRole]);
    if (!check.ok) return fail(check.reason ?? "That reporting line is not allowed.");

    // Walk up from the proposed manager: if we meet the subject, this edge
    // would close a loop, and a cycle in the org chart makes the transitive
    // report walk meaningless for everybody in it.
    let cursor: string | null = manager.managerId;
    for (let i = 0; i < 12 && cursor; i++) {
      if (cursor === subject.id) return fail("That would make the reporting line circular.");
      const up: { managerId: string | null } | null = await prisma.teamMember.findUnique({
        where: { id: cursor },
        select: { managerId: true },
      });
      cursor = up?.managerId ?? null;
    }
  }

  // Employee number: honour what was typed, otherwise issue the next one.
  let employeeNo = str("employeeNo") || subject.employeeRecord?.employeeNo || null;
  if (!employeeNo) {
    const count = await prisma.employeeRecord.count({ where: { employeeNo: { not: null } } });
    employeeNo = `ORG-${String(count + 1).padStart(4, "0")}`;
  }
  const clash = await prisma.employeeRecord.findFirst({
    where: { employeeNo, memberId: { not: subject.id } },
  });
  if (clash) return fail(`Employee number ${employeeNo} is already in use.`);

  await prisma.teamMember.update({
    where: { id: subject.id },
    data: {
      role,
      approvalLevel,
      clearance,
      entityId: entityId || null,
      departmentId: departmentId || null,
      managerId: managerId || null,
      positionId: seatUpdate,
    },
  });

  await prisma.employeeRecord.upsert({
    where: { memberId: subject.id },
    update: { employeeNo, contractEntityId: entityId || null },
    create: { memberId: subject.id, employeeNo, status: "ACTIVE", contractEntityId: entityId || null },
  });

  // The document pack follows the role. Changing somebody to a manager creates
  // the delegation-of-authority requirement immediately, rather than leaving it
  // to be noticed at an audit.
  const record = await prisma.employeeRecord.findUnique({ where: { memberId: subject.id } });
  const required = requiredDocumentsForRole(role, record?.employmentType ?? "FULL_TIME");
  for (const r of required) {
    await prisma.employeeDocument.upsert({
      where: { memberId_code: { memberId: subject.id, code: r.code } },
      // Status is never reset — somebody's verified contract stays verified
      // when they are promoted.
      update: { name: r.name, classification: r.classification, mandatory: r.mandatory },
      create: {
        memberId: subject.id,
        code: r.code,
        name: r.name,
        classification: r.classification,
        mandatory: r.mandatory,
        status: "MISSING",
      },
    });
  }

  url.searchParams.set("done", "1");
  return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
}
