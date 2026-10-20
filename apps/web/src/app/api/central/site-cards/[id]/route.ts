import { NextResponse } from "next/server";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { readSiteCardBody, validateSiteCard } from "@/lib/central-site-cards";
import { logAudit } from "@/lib/audit";

/** Edit a website content card. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const target = await prisma.siteCard.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ success: false, error: "Card not found" }, { status: 404 });

  const d = readSiteCardBody(await req.json().catch(() => ({})));
  if (!d) return NextResponse.json({ success: false, error: "Unknown section" }, { status: 400 });
  const invalid = validateSiteCard(d);
  if (invalid) return NextResponse.json({ success: false, error: invalid }, { status: 400 });

  if (d.slug !== target.slug || d.section !== target.section) {
    const clash = await prisma.siteCard.findFirst({
      where: { section: d.section, slug: d.slug, NOT: { id } },
      select: { id: true },
    });
    if (clash) {
      return NextResponse.json({ success: false, error: "That slug is already used in this section" }, { status: 409 });
    }
  }

  await prisma.siteCard.update({ where: { id }, data: d });
  await logAudit(admin, "sitecard.update", `${d.section}/${d.slug}`);
  return NextResponse.json({ success: true });
}

/** Remove a card. The section falls back to the built-in default once empty. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const target = await prisma.siteCard.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ success: false, error: "Card not found" }, { status: 404 });

  await prisma.siteCard.delete({ where: { id } });
  await logAudit(admin, "sitecard.delete", `${target.section}/${target.slug}`);
  return NextResponse.json({ success: true });
}
