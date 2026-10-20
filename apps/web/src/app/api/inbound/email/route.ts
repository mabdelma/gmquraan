import { NextResponse } from "next/server";
import { prisma } from "@app/db";
import { sendEmail } from "@/lib/notify";
import { notifyAdmins } from "@/lib/push";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Inbound-email sink: a mail webhook (e.g. a mailcow pipe transport) POSTs a
 * parsed reply here, and we thread it onto the matching lead's transcript so a
 * customer's email reply lands back on their lead. Protected by a shared secret.
 *
 * Body: { from, subject?, text }. Matches the most recent lead by sender email;
 * if none exists, a new lead is created so nothing is lost. The ops team is
 * notified by email.
 */
export async function POST(req: Request) {
  const secret = process.env.INBOUND_SECRET;
  if (!secret || req.headers.get("x-inbound-secret") !== secret) {
    return NextResponse.json({ success: false }, { status: 403 });
  }
  let b: { from?: string; subject?: string; text?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "invalid json" }, { status: 400 });
  }
  const from = String(b.from || "").trim().toLowerCase().slice(0, 320);
  const subject = String(b.subject || "").trim().slice(0, 300);
  const text = String(b.text || "").trim().slice(0, 8000);
  if (!from || !text) return NextResponse.json({ success: false, error: "from and text required" }, { status: 400 });

  const stamp = `[${new Date().toISOString().slice(0, 16).replace("T", " ")}] ${from} (inbound): ${text}`;

  // Thread onto the most recent lead from this sender, else open a new one.
  const lead = await prisma.lead.findFirst({ where: { email: from }, orderBy: { createdAt: "desc" } });
  let leadId: string;
  if (lead) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        lastContactedAt: new Date(),
        // A fresh reply needs attention again (unless the lead is already terminal).
        status: lead.status === "CONVERTED" || lead.status === "LOST" ? lead.status : "NEW",
        notes: lead.notes ? `${lead.notes}\n\n${stamp}` : stamp,
      },
    });
    leadId = lead.id;
  } else {
    const created = await prisma.lead.create({
      data: { name: from.split("@")[0] || from, email: from, message: text, source: "email", notes: stamp },
    });
    leadId = created.id;
  }

  // Best-effort ops notification.
  await sendEmail({
    to: process.env.MONITOR_ALERT_TO || "info@gmquran.com",
    template: "systemAlert",
    vars: { alertSubject: `Lead reply from ${from}`, message: `${subject ? subject + "\n\n" : ""}${text}\n\n— Threaded onto lead ${leadId}.` },
  });
  void notifyAdmins({ title: `Lead reply from ${from}`, body: text.slice(0, 140), data: { type: "lead", leadId, url: "/central/leads" } });

  return NextResponse.json({ success: true, leadId });
}
