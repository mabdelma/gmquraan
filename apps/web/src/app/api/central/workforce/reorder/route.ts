import { NextResponse } from "next/server";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { logAudit } from "@/lib/audit";

/** Persist card order on /cards: { ids: [...] } in the intended sequence. */
export async function POST(req: Request) {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(b.ids) ? b.ids.map(String) : [];
  if (!ids.length) return NextResponse.json({ success: false, error: "No order supplied" }, { status: 400 });

  await prisma.$transaction(
    ids.map((id: string, i: number) => prisma.workforcePerson.update({ where: { id }, data: { position: i } }))
  );
  await logAudit(admin, "workforce.reorder", null, `${ids.length} people`);
  return NextResponse.json({ success: true });
}
