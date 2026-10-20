import { NextResponse } from "next/server";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { generateProductKey } from "@/lib/product-api";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  const keys = await prisma.productKey.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, prefix: true, active: true, lastUsedAt: true, createdAt: true, revokedAt: true, syncUrl: true },
  });
  return NextResponse.json({ success: true, keys });
}

export async function POST(req: Request) {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const name = String(b.name || "").trim().slice(0, 60);
  if (!name) return NextResponse.json({ success: false, error: "Product name is required" }, { status: 400 });
  const syncUrl = b.syncUrl ? String(b.syncUrl).trim().slice(0, 300) : null;
  const syncSecret = b.syncSecret ? String(b.syncSecret).trim().slice(0, 300) : null;

  const { key, keyHash, prefix } = generateProductKey();
  await prisma.productKey.create({ data: { name, keyHash, prefix, syncUrl, syncSecret } });
  await logAudit(admin, "productkey.create", name);
  // Plaintext key returned once — never stored.
  return NextResponse.json({ success: true, key });
}

/** Update an existing product key's instant-sync endpoint (URL + secret). */
export async function PATCH(req: Request) {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const id = String(b.id || "");
  if (!id) return NextResponse.json({ success: false, error: "id required" }, { status: 400 });
  const data: Record<string, string | null> = {};
  if (b.syncUrl !== undefined) data.syncUrl = b.syncUrl ? String(b.syncUrl).trim().slice(0, 300) : null;
  if (b.syncSecret !== undefined) data.syncSecret = b.syncSecret ? String(b.syncSecret).trim().slice(0, 300) : null;
  await prisma.productKey.update({ where: { id }, data });
  await logAudit(admin, "productkey.update", id);
  return NextResponse.json({ success: true });
}
