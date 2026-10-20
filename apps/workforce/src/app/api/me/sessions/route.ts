import { NextResponse } from "next/server";
import { memberOr401 } from "@/lib/guard";
import { SESSION_COOKIE, revokeAllSessions } from "@/lib/session";

export const dynamic = "force-dynamic";

/** End every session for this member, this one included. */
export async function POST(req: Request) {
  const auth = await memberOr401();
  if (!auth) return new NextResponse(null, { status: 303, headers: { Location: "/" } });

  await revokeAllSessions(auth.member.id);
  const res = new NextResponse(null, { status: 303, headers: { Location: "/" } });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
