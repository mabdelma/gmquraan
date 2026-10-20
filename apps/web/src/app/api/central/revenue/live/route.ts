import { NextResponse } from "next/server";
import { getCentralAdmin } from "@/lib/central-session";
import { revenueSnapshot } from "@/lib/revenue-snapshot";

export const dynamic = "force-dynamic";

/** Live revenue snapshot for the central ticker (polled fallback). */
export async function GET() {
  if (!(await getCentralAdmin())) return NextResponse.json({ success: false }, { status: 403 });
  return NextResponse.json({ success: true, data: await revenueSnapshot() });
}
