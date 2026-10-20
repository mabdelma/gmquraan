import { NextResponse } from "next/server";
import { prisma } from "@app/db";
import { sendEmail } from "@/lib/notify";
import { notifyAdmins } from "@/lib/push";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/partners/apply — public partner-application intake.
 * Body: { name, email, company?, website?, message?, hp? }
 * Captures the application as a Lead (source "partner-application") and notifies ops.
 */
export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }
  // Honeypot: silently accept bots without recording.
  if (b.hp) return NextResponse.json({ success: true });

  const name = String(b.name || "").trim().slice(0, 160);
  const email = String(b.email || "").trim().slice(0, 320);
  const company = String(b.company || "").trim().slice(0, 200);
  const website = String(b.website || "").trim().slice(0, 300);
  const message = String(b.message || "").trim().slice(0, 4000);
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ success: false, error: "Name and a valid email are required" }, { status: 400 });
  }

  const body = [
    "Partner application.",
    company && `Company: ${company}`,
    website && `Website: ${website}`,
    message && `\n${message}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await prisma.lead.create({
      data: { name, email, company: company || null, message: body, source: "partner-application", status: "NEW" },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Could not submit — please try again" }, { status: 500 });
  }

  // Best-effort ops notification.
  await sendEmail({
    to: process.env.MONITOR_ALERT_TO || "info@gmquran.com",
    template: "systemAlert",
    vars: { alertSubject: `Partner application — ${name}`, message: `${name} <${email}>\n${body}` },
  });
  void notifyAdmins({ title: "New partner application", body: company ? `${name} · ${company}` : name, data: { type: "partner_application", url: "/central/leads" } });

  return NextResponse.json({ success: true });
}
