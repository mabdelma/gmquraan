import QRCode from "qrcode";
import { resolvePerson } from "@/lib/cards-store";
import { getLocale } from "@/lib/i18n.server";
import { COMPANY } from "@/lib/content";

export const runtime = "nodejs";

/**
 * QR for a person's card. Encodes the public card URL rather than the vCard
 * itself — a URL stays scannable at small print sizes, and the landing page
 * then offers the vCard download.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const person = await resolvePerson(slug, await getLocale());
  if (!person) return new Response("Not found", { status: 404 });

  const url = `https://${COMPANY.domain}/cards/${slug}`;
  const png = await QRCode.toBuffer(url, {
    type: "png",
    width: 640,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#0b1220ff", light: "#ffffffff" },
  });

  return new Response(new Uint8Array(png), {
    headers: { "content-type": "image/png", "cache-control": "public, max-age=3600" },
  });
}
