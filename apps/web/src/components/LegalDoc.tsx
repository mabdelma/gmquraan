import { COMPANY, REGISTRATION } from "@/lib/content";
import { t } from "@/lib/brand-content";
import { LegalEntities } from "./LegalEntities";
import type { Locale } from "@/lib/i18n";
import { getUi } from "@/lib/ui-i18n";
import { localizeLegalStrings } from "@/lib/translate-legal";

export type LegalClause = { h: string; body: string[] };

const LAST_UPDATED = "Last updated:";
const EFFECTIVE = "· Effective immediately on publication.";
const GOVERNING =
  "This document is governed by the laws of the Arab Republic of Egypt, without prejudice to mandatory consumer- " +
  "and data-protection rights you may have under the laws of your country of residence. The English version is " +
  "the governing version; translations are provided for convenience only.";

/** Shared, professionally-structured legal document layout (privacy, terms, etc.).
 *  Content is auto-localized into the selected language (cached); English governs.
 *  Paragraphs render as <p>; lines beginning with "• " render as bullet items. */
export async function LegalDoc({
  eyebrow,
  title,
  updated,
  intro,
  sections,
  locale,
  governing = true,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  intro: string[];
  sections: LegalClause[];
  locale: Locale;
  governing?: boolean;
}) {
  // Translate everything in one cached batch.
  const flat = [eyebrow, title, LAST_UPDATED, EFFECTIVE, GOVERNING, ...intro, ...sections.flatMap((s) => [s.h, ...s.body])];
  const tr = await localizeLegalStrings(flat, locale);
  let i = 0;
  const tEyebrow = tr[i++];
  const tTitle = tr[i++];
  const tLastUpdated = tr[i++];
  const tEffective = tr[i++];
  const tGoverning = tr[i++];
  const tIntro = intro.map(() => tr[i++]);
  const tSections = sections.map((s) => ({ h: tr[i++], body: s.body.map(() => tr[i++]) }));
  const ui = getUi(locale);

  return (
    <section className="mx-auto max-w-3xl px-5 py-16">
      <div className="text-xs font-bold tracking-widest uppercase app-gradient-text mb-3">{tEyebrow}</div>
      <h1 className="text-3xl md:text-4xl font-extrabold">{tTitle}</h1>
      <p className="text-[color:var(--ink)]/55 text-sm mt-2">{tLastUpdated} {updated} {tEffective}</p>

      <div className="panel rounded-2xl p-5 mt-6 text-sm text-[color:var(--ink)]/60 space-y-2">
        <LegalEntities ui={ui} pending={t(REGISTRATION.pendingLoc, locale)} />
        <div>
          <a href={`mailto:${COMPANY.email}`} className="text-[color:var(--accent-text)]">{COMPANY.email}</a>
        </div>
      </div>

      {tIntro.map((p, k) => (
        <p key={k} className="text-[color:var(--ink)]/65 mt-4 leading-relaxed">{p}</p>
      ))}

      <div className="mt-8 space-y-7">
        {tSections.map((s) => (
          <div key={s.h}>
            <h2 className="font-bold text-lg text-[color:var(--ink)]/90">{s.h}</h2>
            <div className="mt-2 space-y-2">
              {s.body.map((line, k) =>
                line.startsWith("• ") ? (
                  <li key={k} className="text-[color:var(--ink)]/65 text-sm leading-relaxed ml-5 list-disc">{line.slice(2)}</li>
                ) : (
                  <p key={k} className="text-[color:var(--ink)]/65 text-sm leading-relaxed">{line}</p>
                )
              )}
            </div>
          </div>
        ))}
      </div>

      {governing && <p className="text-[color:var(--ink)]/55 mt-10 text-xs leading-relaxed">{tGoverning}</p>}
    </section>
  );
}
