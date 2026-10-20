import { NextResponse } from "next/server";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { readSiteCardBody, validateSiteCard } from "@/lib/central-site-cards";
import { logAudit } from "@/lib/audit";

/** Create a website content card. */
export async function POST(req: Request) {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  const d = readSiteCardBody(await req.json().catch(() => ({})));
  if (!d) return NextResponse.json({ success: false, error: "Unknown section" }, { status: 400 });
  const invalid = validateSiteCard(d);
  if (invalid) return NextResponse.json({ success: false, error: invalid }, { status: 400 });

  const clash = await prisma.siteCard.findFirst({
    where: { section: d.section, slug: d.slug },
    select: { id: true },
  });
  if (clash) {
    return NextResponse.json({ success: false, error: "That slug is already used in this section" }, { status: 409 });
  }

  // New cards go to the end of their section unless a position was given.
  const last = await prisma.siteCard.findFirst({
    where: { section: d.section },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  const position = d.position || (last ? last.position + 1 : 0);

  await prisma.siteCard.create({ data: { ...d, position } });
  await logAudit(admin, "sitecard.create", `${d.section}/${d.slug}`);
  return NextResponse.json({ success: true });
}
