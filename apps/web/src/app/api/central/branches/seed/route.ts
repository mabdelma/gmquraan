import { NextResponse } from "next/server";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { defaultBranches } from "@/lib/branches";
import { logAudit } from "@/lib/audit";

/** Import the entities already described in the site legal blocks. */
export async function POST() {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  const existing = new Set((await prisma.branch.findMany({ select: { slug: true } })).map((r) => r.slug));
  let created = 0;
  let skipped = 0;
  for (const b of defaultBranches()) {
    if (existing.has(b.slug)) {
      skipped++;
      continue;
    }
    await prisma.branch.create({ data: b });
    created++;
  }
  await logAudit(admin, "branch.seed", null, `created=${created}, skipped=${skipped}`);
  return NextResponse.json({ success: true, created, skipped });
}
