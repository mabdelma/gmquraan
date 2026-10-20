import { NextResponse } from "next/server";
import { getCentralAdmin } from "@/lib/central-session";
import {
  getEmailTemplateOverrides,
  setEmailTemplateOverride,
  EDITABLE_TEMPLATES,
} from "@/lib/settings";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ success: true, overrides: await getEmailTemplateOverrides() });
}

export async function POST(req: Request) {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const template = String(b.template || "");
  if (!(EDITABLE_TEMPLATES as readonly string[]).includes(template)) {
    return NextResponse.json({ success: false, error: "Unknown template" }, { status: 400 });
  }
  const clean = (v: unknown) => (typeof v === "string" ? v.slice(0, 4000) : undefined);
  const image = clean(b.image);
  if (image && /\.svg(\?|$)/i.test(image)) {
    return NextResponse.json(
      { success: false, error: "SVG images don't display in Gmail/Outlook. Please upload a PNG or JPG." },
      { status: 415 }
    );
  }
  await setEmailTemplateOverride(template, {
    subject: clean(b.subject),
    title: clean(b.title),
    body: clean(b.body),
    btn: clean(b.btn),
    image,
  });
  await logAudit(admin, "settings.update", `email template: ${template}`);
  return NextResponse.json({ success: true });
}
