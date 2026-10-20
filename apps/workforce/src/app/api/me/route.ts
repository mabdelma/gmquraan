import { prisma } from "@app/db";
import { memberOr401 } from "@/lib/guard";
import { isSelfEditable, isSelfEditableHrField } from "@app/core";

export const dynamic = "force-dynamic";

/**
 * Update your own details.
 *
 * Two allow-lists, checked rather than assumed: the member row accepts only
 * SELF_EDITABLE_FIELDS, and the employee record only SELF_EDITABLE_HR_FIELDS.
 * Anything else posted is dropped — including a business-card field, a `role`,
 * or an `approvalLevel` sent by somebody editing the form in devtools.
 */
export async function POST(req: Request) {
  const auth = await memberOr401();
  if (!auth) return new Response(null, { status: 303, headers: { Location: "/" } });

  const form = await req.formData();
  const memberData: Record<string, string | null> = {};
  const hrData: Record<string, string | null> = {};

  for (const [key, raw] of form.entries()) {
    const v = String(raw).trim().slice(0, 300);
    const value = v === "" ? null : v;
    if (isSelfEditable(key)) memberData[key] = value;
    else if (isSelfEditableHrField(key)) hrData[key] = value;
    // Everything else is deliberately ignored.
  }

  const url = new URL("/me", req.url);

  if (hrData.personalEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(hrData.personalEmail)) {
    url.searchParams.set("error", "That personal email address does not look right.");
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  }

  if (Object.keys(memberData).length) {
    await prisma.teamMember.update({ where: { id: auth.member.id }, data: memberData });
  }
  if (Object.keys(hrData).length) {
    // upsert: someone may not have a file yet if they joined between seeds.
    await prisma.employeeRecord.upsert({
      where: { memberId: auth.member.id },
      update: hrData,
      create: { memberId: auth.member.id, status: "ACTIVE", ...hrData },
    });
  }

  url.searchParams.set("saved", "1");
  return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
}
