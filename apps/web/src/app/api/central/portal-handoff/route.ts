import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { getCentralAdmin } from "@/lib/central-session";

export const dynamic = "force-dynamic";

/**
 * Hand a signed-in central administrator across to the team portal.
 *
 * Deliberately a handoff rather than a shared cookie. The central session is a
 * host-only cookie on purpose — widening it to .gmquran.com would
 * send an admin credential to the advisor, the mail host, ntfy and every other
 * subdomain, which is a real regression in exchange for a small convenience.
 *
 * So this mints a token that is good for sixty seconds, for one named person,
 * and for nothing else. The portal verifies it with the shared AUTH_SECRET,
 * which both services already hold.
 *
 * What it does NOT do is bypass the second factor. The portal applies exactly
 * the same MFA policy to an SSO arrival as to a password sign-in — otherwise
 * this route would be a way around the thing MFA exists for.
 */
export async function GET() {
  const admin = await getCentralAdmin();
  if (!admin) {
    // Relative, and not built from req.url: behind the proxy that origin is
    // localhost:3000, so an expired console session sent the browser to
    // https://localhost:3000/… and the team portal looked locally hosted.
    // The sign-in form is /central itself — /central/login never existed.
    return new NextResponse(null, { status: 303, headers: { Location: "/central" } });
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    // Without a shared secret the portal cannot verify anything, and a token
    // signed with a default would be forgeable by anybody who read the source.
    return NextResponse.json({ error: "Single sign-on is not configured." }, { status: 500 });
  }

  const payload = Buffer.from(
    JSON.stringify({ email: admin.email, exp: Date.now() + 60_000 })
  ).toString("base64url");
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");

  const portal = process.env.PORTAL_URL || "https://workforce.gmquran.com";
  return new NextResponse(null, {
    status: 303,
    headers: {
      Location: `${portal}/sso/${payload}.${sig}`,
      // The Location carries a live credential. Nothing may keep a copy — a
      // cached redirect replays a token that expired sixty seconds after it
      // was minted, which fails as "the portal rejected me" with no clue why.
      "cache-control": "no-store, private",
    },
  });
}
