import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

// Next generates a fresh BUILD_ID per build, so this value changes on every deploy.
let cached: string | null = null;
function buildId(): string {
  if (cached) return cached;
  try {
    cached = readFileSync(join(process.cwd(), ".next", "BUILD_ID"), "utf8").trim();
  } catch {
    cached = String(Date.now());
  }
  return cached;
}

/** Lightweight version probe — clients poll this and reload when it changes,
 *  so installed PWA / mobile-app sessions auto-update after any deploy. */
export async function GET() {
  return NextResponse.json({ version: buildId() }, { headers: { "cache-control": "no-store" } });
}
