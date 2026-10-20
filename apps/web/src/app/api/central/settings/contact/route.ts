import { NextResponse } from "next/server";
import { getCentralAdmin } from "@/lib/central-session";
import { getContactSettings, setContactSettings } from "@/lib/settings";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ success: true, settings: await getContactSettings() });
}

export async function POST(req: Request) {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const digits = typeof b.whatsapp === "string" ? b.whatsapp.replace(/[^0-9]/g, "") : "";
  if (digits.length < 6 || digits.length > 20) {
    return NextResponse.json({ success: false, error: "Enter a valid international number (digits only, e.g. 15555550107)." }, { status: 400 });
  }
  await setContactSettings({ whatsapp: digits });
  await logAudit(admin, "settings.update", `whatsapp=${digits}`);
  return NextResponse.json({ success: true });
}
