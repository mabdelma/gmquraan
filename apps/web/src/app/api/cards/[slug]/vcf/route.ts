import { resolvePerson } from "@/lib/cards-store";
import { buildVCard } from "@/lib/vcard";
import { getLocale } from "@/lib/i18n.server";
import { getMessages } from "@/lib/messages";

/** Downloadable contact card for people added through /central/workforce. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const person = await resolvePerson(slug, locale);
  if (!person) return new Response("Not found", { status: 404 });

  const t = getMessages(locale).cards;
  const roleLabel = person.roleLabel || t.roles[person.role] || "";

  return new Response(buildVCard(person, roleLabel), {
    headers: {
      "content-type": "text/vcard; charset=utf-8",
      "content-disposition": `attachment; filename="${slug}.vcf"`,
      "cache-control": "no-store",
    },
  });
}
