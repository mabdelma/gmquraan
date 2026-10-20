import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Public VAPID application-server key for self-hosted Web Push. The client fetches
 * it at runtime (so it doesn't need to be inlined at build time) and uses it to
 * subscribe. Returns { key: null } when Web Push isn't configured — the client
 * then hides the opt-in. The private key never leaves the server.
 */
export function GET() {
  return NextResponse.json({ key: process.env.VAPID_PUBLIC_KEY || null });
}
