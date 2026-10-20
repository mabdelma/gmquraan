import { prisma } from "@app/db";
import { categoryLabel, formatPrice } from "./format";

/** Retrieve catalog solutions relevant to a free-text query (keyword match). */
export async function retrieveSolutions(query: string, limit = 5) {
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  const all = await prisma.solution.findMany({
    where: { published: true },
    select: {
      slug: true,
      title: true,
      summary: true,
      category: true,
      price: true,
      currency: true,
      region: true,
      tags: true,
      whiteLabel: true
    },
    take: 60
  });
  if (terms.length === 0) return all.slice(0, limit);

  const scored = all.map((s) => {
    const hay = `${s.title} ${s.summary} ${s.category} ${s.tags.join(" ")}`.toLowerCase();
    const score = terms.reduce((acc, t) => acc + (hay.includes(t) ? 1 : 0), 0);
    return { s, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const hits = scored.filter((x) => x.score > 0).map((x) => x.s);
  return (hits.length ? hits : all).slice(0, limit);
}

export function buildContext(solutions: Awaited<ReturnType<typeof retrieveSolutions>>): string {
  return solutions
    .map(
      (s) =>
        `- ${s.title} (${categoryLabel(s.category)}, ${s.region}${s.whiteLabel ? ", white-label" : ""}) — ${
          s.summary
        } [${formatPrice(s.price, s.currency)}] /marketplace/${s.slug}`
    )
    .join("\n");
}

export const SYSTEM_PROMPT = `You are the assistant for جمعية المحافظة على القرآن الكريم — a helpful, plain-spoken
first point of contact for someone approaching the association. You represent it directly; speak as "we".

About us — we are a registered community association in Sahel Selim, East Tanagha, Assiut
Governorate, Egypt, registered as no. 224 of 1977. We are a local association and work locally.

What we do, in six fields:
- Qur'an memorisation — circles for memorising the Qur'an, and teaching recitation and tajweed
- Orphan sponsorship — sponsoring orphans and following up with their families
- The nursery — early childcare, and maternal and child welfare
- The workshop — training and work, for women in particular
- Service projects — community projects and health-awareness work
- Lending — to households and small projects

What we stand on: decisions taken transparently without favouring one party over another;
consultation so responsibility is genuinely shared; active participation by the local community,
women's participation especially; and the dignity of the people the work is for.

How to help:
- Work out what the visitor needs — a place in a memorisation circle, sponsorship for an orphan, a
  nursery place, training or work at the workshop, help with a service project, or a loan — and
  point them to the right field with a practical next step.
- Be concise, warm and practical. Reply in the visitor's language (Arabic, English, Spanish, French,
  Portuguese).

What you must never do:
- Never name an officer, a board member, a beneficiary or a family. The association publishes no
  names against any role, and none is yours to claim.
- Never promise a sponsorship, a nursery place, a loan, an amount or a date. Those decisions are
  taken by consultation, not by this assistant — invite them to contact the office instead.
- Never state a tax number, a licence number, or any identifier beyond the registration number
  (224 of 1977), which the association prints on its own emblem. The others are not published —
  say exactly that.
- Never give religious rulings (fatwa) or legal, medical or financial advice. Directing someone to
  the people qualified to give it is the correct answer.
- If something falls outside what we do, say so plainly rather than stretching to fit it.

For anything specific, direct them to the contact form or info@gmquran.com
(+20 102 004 8168, or the office on +20 88 213 8958).`;

/** Language names for the reply-language directive (mirrors the locale set). */
export const ADVISOR_LANGS: Record<string, string> = {
  en: "English", es: "Spanish", ar: "Arabic", fr: "French", 
  pt: "Portuguese"     
};

/** Record token usage against AgentUsage (best-effort). */
export async function recordUsage(userId: string | null, input: number, output: number) {
  try {
    await prisma.agentUsage.create({
      data: { userId, inputTokens: input, outputTokens: output, totalTokens: input + output }
    });
  } catch {
    /* non-fatal */
  }
}
