import QRCode from "qrcode";
import { prisma } from "@app/db";
import { getMember, getPendingMember } from "@/lib/session";
import { otpauthUri } from "@app/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The QR for the enrolment page.
 *
 * The secret is never in the URL. It is read from the row belonging to whoever
 * is signed in — a query parameter would put a live authentication secret in
 * the proxy logs, the browser history and any Referer header the page emits.
 *
 * It reads the pending secret rather than minting one, because beginEnrolment
 * writes a fresh secret on every call: generating here would hand back a QR for
 * a different secret than the key printed beside it, and the code from the app
 * would then be rejected with nothing on screen to explain why.
 */
export async function GET() {
  // Half-finished sessions count. Somebody who must enrol before they can go
  // anywhere is exactly the person who needs this image.
  const member = await getMember();
  const pending = member ? null : await getPendingMember();
  if (!member && !pending) return new Response("Not found", { status: 404 });

  const row = await prisma.teamMember.findUnique({
    where: { id: member?.id ?? pending!.id },
    select: { email: true, totpSecret: true, totpEnabled: true },
  });
  // Nothing pending, or already confirmed: there is no secret this route is
  // entitled to draw. Re-enrolling goes through the page, which mints a new one.
  if (!row?.totpSecret || row.totpEnabled) return new Response("Not found", { status: 404 });

  const png = await QRCode.toBuffer(otpauthUri(row.totpSecret, row.email), {
    type: "png",
    width: 480,
    margin: 2,
    // Phone cameras read this off a screen at an angle, often a dim one.
    errorCorrectionLevel: "M",
    // Fixed black on white regardless of the viewer's theme. A QR tinted to
    // match a dark page is a QR that scanners refuse.
    color: { dark: "#000000ff", light: "#ffffffff" },
  });

  return new Response(new Uint8Array(png), {
    headers: {
      "content-type": "image/png",
      // It encodes a credential, so nothing caches it anywhere.
      "cache-control": "no-store, private",
    },
  });
}
