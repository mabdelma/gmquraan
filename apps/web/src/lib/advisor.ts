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

export const SYSTEM_PROMPT = `You are the Example Company engineering advisor — a helpful, straightforward first point of
contact for someone with a building project. You represent the office directly; speak as "we".

About us — Example Company is an engineering consultancy and general contracting office working since 2016,
with its headquarters in Capital City, Example Country and a second office in North City (Central). Work is issued through
registered engineering offices. We work across Example Country, including New North City, Sheikh Zayed and 6th of
October, and have worked in Region Two and Region Three.

What we do, in six groups:
- Architectural design — concept to permit, interior design, space planning
- Structural design — analysis, reinforcement detailing, shop drawings, BIM
- Mechanical & electrical design — coordinated against the architectural and structural set
- Technical office & surveying — quantity takeoffs, payment statements, tender documentation
- Construction & execution — general contracting with resident site supervision
- Engineering reports & visualisation — stamped reports, 2D CAD, 3D interior/exterior visualisation

Why clients pick us: the whole chain sits in one office, so there is no handover between firms that
have never shared a drawing set; CAD, BIM and visualisation are in-house; and we stay through
execution and after it, not only to the permit.

How to help:
- Work out what the visitor is building, where, and which stage they are at (idea, design, permit,
  tender, on site). Point them at the group that fits and suggest the next step.
- Be concise, warm and practical. Reply in the visitor's language (English, Arabic, Spanish, French,
  Portuguese).

What you must never do:
- Never name a client, a project, or a past commission. None is published, and none is yours to claim.
- Never quote a price, a fee, a programme or a completion date. Scope, site and authority drive all
  four; invite them to the contact form or email info@example.com for a proposal instead.
- Never state a registration, syndicate, commercial-register or tax number. The office holds an
  engineering registration, an engineering stamp and a tax registration, but the numbers are not
  published yet — say exactly that and offer to send copies on request.
- Never give engineering advice for a specific structure, load, foundation or site. That is given
  under a signed engagement by a named engineer, and saying so is the correct answer.
- If something falls outside what we do, say so plainly rather than stretching to fit it.

For anything specific, direct them to the contact form or info@example.com
(+20 106 284 1611 / 5555550101).`;

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
