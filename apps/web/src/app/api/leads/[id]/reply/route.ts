import { NextResponse } from "next/server";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { sendEmail } from "@/lib/notify";

/** Answer a lead: email the enquirer a free-text reply and mark the lead contacted. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const central = await getCentralAdmin();
  if (!central) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const message = String(b.message || "").trim().slice(0, 5000);
  if (!message) return NextResponse.json({ success: false, error: "A reply is required" }, { status: 400 });

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { user: { select: { locale: true } } }
  });
  if (!lead) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

  const ok = await sendEmail({
    to: lead.email,
    template: "leadReply",
    locale: lead.user?.locale ?? undefined,
    vars: { message }
  });
  if (!ok) {
    return NextResponse.json({ success: false, error: "Email service unavailable — reply not sent" }, { status: 502 });
  }

  // Record the contact: keep a dated transcript in the private notes, advance NEW → CONTACTED.
  const stamp = `[${new Date().toISOString().slice(0, 16).replace("T", " ")}] ${central.email}: ${message}`;
  await prisma.lead.update({
    where: { id },
    data: {
      lastContactedAt: new Date(),
      status: lead.status === "NEW" ? "CONTACTED" : lead.status,
      notes: lead.notes ? `${lead.notes}\n\n${stamp}` : stamp
    }
  });
  return NextResponse.json({ success: true });
}
