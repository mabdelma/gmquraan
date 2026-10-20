import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@app/db";
import { completeAuthentication } from "@/lib/after-auth";

export const dynamic = "force-dynamic";

/**
 * Accept a handoff from the central console.
 *
 * The token is verified against the shared AUTH_SECRET, is good for sixty
 * seconds, and names one person. It is then thrown away — this route grants a
 * session and nothing more.
 *
 * It routes through completeAuthentication, the same step the password and
 * magic-link paths use, which means the second factor applies here identically.
 * An SSO route that skipped it would be a door around the lock rather than a
 * second key to it.
 */
export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const home = new URL("/", req.url);

  const secret = process.env.AUTH_SECRET;
  if (!secret || !token.includes(".")) {
    home.searchParams.set("error", "That sign-in link is not valid.");
    return new Response(null, { status: 303, headers: { Location: home.pathname + home.search } });
  }

  const [payload, sig] = token.split(".");
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    home.searchParams.set("error", "That sign-in link is not valid.");
    return new Response(null, { status: 303, headers: { Location: home.pathname + home.search } });
  }

  let email: string;
  try {
    const d = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof d.exp !== "number" || d.exp < Date.now() || !d.email) throw new Error("expired");
    email = String(d.email).toLowerCase();
  } catch {
    home.searchParams.set("error", "That sign-in link has expired. Try again from the console.");
    return new Response(null, { status: 303, headers: { Location: home.pathname + home.search } });
  }

  // Being a central administrator does not create a portal account. If there
  // is no team member for this address, there is nothing to sign in to, and
  // silently making one would put somebody in the org chart by side effect.
  const member = await prisma.teamMember.findUnique({
    where: { email },
    select: { id: true, status: true },
  });
  if (!member || member.status !== "ACTIVE") {
    home.searchParams.set(
      "error",
      "That console account has no team portal member. Ask People to add one."
    );
    return new Response(null, { status: 303, headers: { Location: home.pathname + home.search } });
  }

  return completeAuthentication(member.id, "sso");
}
