import { NextResponse } from "next/server";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { defaultPeople } from "@/lib/cards-store";
import { logAudit } from "@/lib/audit";

/**
 * Import the people already on /cards so the editor starts from live content,
 * keeping their hand-made QR and .vcf assets. Existing rows are left alone.
 */
export async function POST() {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  const existing = new Set((await prisma.workforcePerson.findMany({ select: { slug: true } })).map((r) => r.slug));
  let created = 0;
  let skipped = 0;
  for (const p of defaultPeople()) {
    if (existing.has(p.slug)) { skipped++; continue; }
    const { roleCopy, ...rest } = p;
    await prisma.workforcePerson.create({ data: roleCopy ? { ...rest, roleCopy } : rest });
    created++;
  }
  await logAudit(admin, "workforce.seed", null, `created=${created}, skipped=${skipped}`);
  return NextResponse.json({ success: true, created, skipped });
}
