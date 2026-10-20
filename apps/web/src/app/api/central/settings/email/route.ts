import { NextResponse } from "next/server";
import { getCentralAdmin } from "@/lib/central-session";
import { getEmailSettings, setEmailSettings } from "@/lib/settings";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ success: true, settings: await getEmailSettings() });
}

export async function POST(req: Request) {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const clean = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, 500) : undefined);
  const logoUrl = clean(b.logoUrl);
  if (logoUrl && /\.svg(\?|$)/i.test(logoUrl)) {
    return NextResponse.json(
      { success: false, error: "SVG logos don't display in Gmail/Outlook. Please upload a PNG or JPG." },
      { status: 415 }
    );
  }
  await setEmailSettings({
    brandName: clean(b.brandName),
    fromName: clean(b.fromName),
    footer: clean(b.footer),
    replyTo: clean(b.replyTo),
    logoUrl,
  });
  await logAudit(admin, "settings.update", "email branding");
  return NextResponse.json({ success: true });
}
