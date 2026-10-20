import { NextResponse } from "next/server";
import { CENTRAL_COOKIE, centralCookieOptions } from "@/lib/central-session";

/** Clear the central admin session. */
export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(CENTRAL_COOKIE, "", { ...centralCookieOptions(0), maxAge: 0 });
  return res;
}
