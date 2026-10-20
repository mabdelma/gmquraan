import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, revokeSession } from "@/lib/session";

/** Sign out — revokes the session row, not just the cookie. */
export async function POST(req: Request) {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (raw) await revokeSession(raw);
  const res = new NextResponse(null, { status: 303, headers: { Location: "/" } });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
