/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { ABOUT, STEWARDSHIP, HERO, PRACTICE_AREAS, SECTIONS, VALUES, t } from "@/lib/brand-content";
import { COMPANY, REGIONS } from "@/lib/content";
import { PRACTICE_ICON, VALUE_ICON } from "./icons";

/**
 * The homepage of an engineering consultancy and contracting office.
 *
 * Two rules run through all of it. Every string comes from lib/brand-content,
 * which holds reviewed Arabic and English and nothing invented. And every
 * layout uses logical properties — ms/me, start/end, ps/pe — rather than
 * left/right, so the Arabic RTL version is the same components mirrored by the
 * document direction instead of a second stylesheet that drifts.
 *
 * There are no portraits anywhere on this page. The office has supplied none,
 * and a stock photograph standing in for a named engineer is the one
 * fabrication a reader has no way to detect.
 */

/** Thin gold rule with a diamond, the brand's recurring divider. */
export function Ornament({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`} aria-hidden="true">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[color:var(--accent)] to-transparent" />
      <span className="size-1.5 rotate-45 bg-[color:var(--accent)]" />
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[color:var(--accent)] to-transparent" />
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.2em] uppercase text-[color:var(--accent)]">
      <span className="size-1 rotate-45 bg-[color:var(--accent)]" aria-hidden="true" />
      {children}
    </div>
  );
}

/* ── Hero ──────────────────────────────────────────────────────────────────
   The backdrop is one of the office's own exterior visualisations rather than
   a skyline nobody here built. It is decorative — the headline beside it says
   everything the image does — so it carries an empty alt, and the gradient
   over it is what keeps the copy readable rather than luck about where the
   building falls in frame. */
export function Hero({ locale }: { locale: Locale }) {
  return (
    <section className="relative isolate overflow-hidden bg-[#071f1e] text-white">
      <img
        src="/img/projects/project-23.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-20 size-full object-cover object-center opacity-70"
        fetchPriority="high"
      />
      {/* Readability gradient: opaque behind the copy, clearing toward the
          image. Uses logical direction so it flips with the language. */}
      <div
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#071f1e_0%,rgba(7,31,30,0.94)_42%,rgba(7,31,30,0.6)_74%,rgba(7,31,30,0.4)_100%)] rtl:bg-[linear-gradient(to_left,#071f1e_0%,rgba(7,31,30,0.94)_42%,rgba(7,31,30,0.6)_74%,rgba(7,31,30,0.4)_100%)]"
        aria-hidden="true"
      />

      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 px-5 pb-28 pt-16 md:min-h-[560px] md:pb-36 md:pt-20">
        <div className="app-reveal max-w-2xl">
          <Eyebrow>{COMPANY.shortName}</Eyebrow>
          <h1 className="mt-5 text-3xl font-bold leading-[1.25] sm:text-4xl md:text-5xl md:leading-[1.2]">
            {t(HERO.headline, locale)}
            <br />
            <span className="text-[color:var(--accent)]">{t(HERO.headlineAccent, locale)}</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-white/75 md:text-lg">
            {t(HERO.subtitle, locale)}
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Link
              href="/contact"
              className="rounded-xl bg-[color:var(--accent)] px-7 py-3 font-bold text-[color:var(--on-accent)] transition hover:bg-[#1f7a78] focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {t(HERO.primaryCta, locale)}
            </Link>
            <Link
              href="/services"
              className="rounded-xl border border-[color:var(--accent)]/60 px-7 py-3 font-semibold text-white transition hover:border-[color:var(--accent)] hover:bg-white/5"
            >
              {t(HERO.secondaryCta, locale)}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Values strip ─────────────────────────────────────────────────────────
   Five items with hairline separators on desktop; on small screens it becomes
   a two-column grid rather than a row that scrolls sideways. */
export function ValuesStrip({ locale }: { locale: Locale }) {
  return (
    /* Lifted over the hero's lower edge. The negative margin is paired with
       the hero's extra bottom padding so the overlap never eats the CTA
       buttons, at any width. */
    <section className="relative z-10 -mt-20 md:-mt-24">
      <div className="mx-auto max-w-6xl px-5">
        <ul className="grid grid-cols-2 gap-x-4 gap-y-7 rounded-2xl border border-[color:var(--accent)]/25 bg-[#0c3433]/95 p-6 shadow-2xl backdrop-blur sm:grid-cols-3 md:p-8 lg:grid-cols-5">
          {VALUES.map((v, i) => {
            const Icon = VALUE_ICON[v.key];
            return (
              <li
                key={v.key}
                className={`text-center lg:px-4 ${
                  i > 0 ? "lg:border-s lg:border-white/10" : ""
                }`}
              >
                {Icon && <Icon className="mx-auto size-7 text-[color:var(--accent)]" />}
                <h3 className="mt-3 text-sm font-bold text-white">{t(v.title, locale)}</h3>
                <p className="mt-1.5 text-[11px] leading-relaxed text-white/55">{t(v.body, locale)}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ── Practice areas ───────────────────────────────────────────────────────
   Each card is one of the office's own visualisations with the area name as
   real text over it — translatable and searchable in a way baked-in type on
   the image would not be, which is also why the image's alt stays empty. */
export function PracticeGrid({ locale }: { locale: Locale }) {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 md:py-24">
      <div className="text-center">
        <Eyebrow>{t(SECTIONS.practiceEyebrow, locale)}</Eyebrow>
        <h2 className="mt-4 text-3xl font-bold md:text-4xl">{t(SECTIONS.practiceTitle, locale)}</h2>
        <Ornament className="mx-auto mt-6 max-w-xs" />
      </div>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {PRACTICE_AREAS.map((s) => (
          <Link
            key={s.slug}
            href={`/services#${s.slug}`}
            className="group relative block overflow-hidden rounded-xl border border-[color:var(--accent)]/20 transition duration-300 hover:-translate-y-1 hover:border-[color:var(--accent)]/50 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <div className="relative aspect-[4/5] overflow-hidden xl:aspect-[3/4]">
              <img
                src={s.image}
                alt=""
                aria-hidden="true"
                loading="lazy"
                className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-[#071f1e] via-[#071f1e]/50 to-transparent transition-opacity duration-300 group-hover:opacity-90"
                aria-hidden="true"
              />
              {(() => {
                const Icon = PRACTICE_ICON[s.slug];
                return Icon ? (
                  <Icon className="absolute inset-x-0 top-1/3 mx-auto size-10 text-[color:var(--accent)] drop-shadow transition-transform duration-500 group-hover:-translate-y-1" />
                ) : null;
              })()}
              <div className="absolute inset-x-4 bottom-4">
                <span className="block h-px w-8 bg-[color:var(--accent)] transition-all duration-300 group-hover:w-14" aria-hidden="true" />
                <h3 className="mt-2.5 text-sm font-bold leading-snug text-white">{t(s.title, locale)}</h3>
                <span className="mt-1 inline-block text-[11px] font-semibold text-[color:var(--accent)]">
                  {t(SECTIONS.explore, locale)} <span aria-hidden="true">›</span>
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ── Reach ────────────────────────────────────────────────────────────────
   Where the association works, from REGIONS in content.ts. There is one entry
   and that is deliberate: this is a local association serving Sahel Selim and
   East Tanagha in Assiut Governorate, and it claims no reach beyond that
   anywhere on its own site. The strip is built for several regions, so it will
   render more the day there are more — but padding it out would be inventing
   a footprint rather than showing one. */
export function ReachStrip({ locale }: { locale: Locale }) {
  return (
    <section className="bg-[#0c3433] text-white">
      <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
        <div className="text-center">
          <h2 className="text-2xl font-bold md:text-3xl">{t(SECTIONS.reachTitle, locale)}</h2>
          <Ornament className="mx-auto mt-5 max-w-xs" />
        </div>

        <div className="mt-10 grid items-stretch gap-6 lg:grid-cols-[1fr_auto]">
          <ul className="grid gap-y-8 sm:grid-cols-3">
            {REGIONS.map((r, i) => (
              <li key={r.name} className={`px-4 text-center ${i > 0 ? "sm:border-s sm:border-white/10" : ""}`}>
                <span className="text-3xl" aria-hidden="true">{r.flag}</span>
                <div className="font-display mt-3 text-sm font-semibold tracking-wide text-white">
                  {t(r.nameLoc, locale)}
                </div>
                <div className="mt-1 text-[11px] leading-relaxed text-white/55">
                  {t(r.detailLoc, locale)}
                </div>
              </li>
            ))}
          </ul>

          {/* The CTA is a card in the row, not a button stranded underneath —
              it balances the strip rather than trailing off it. */}
          <Link
            href="/contact"
            className="group flex items-center gap-4 rounded-xl border border-[color:var(--accent)]/30 bg-white/[0.03] p-5 transition hover:border-[color:var(--accent)]/70 lg:max-w-xs"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[color:var(--accent)] text-[color:var(--on-accent)] transition group-hover:opacity-90">
              <span aria-hidden="true" className="text-lg rtl:rotate-180">›</span>
            </span>
            <span className="text-start">
              <span className="block text-sm font-bold">{t(SECTIONS.reachCta, locale)}</span>
              <span className="mt-1 block text-xs text-white/55">{t(SECTIONS.reachCtaSub, locale)}</span>
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── Founder ──────────────────────────────────────────────────────────────
   The name on the supplied business card, with the office's positioning in
   its own voice. Deliberately not a pull-quote: no quotation was supplied,
   and inventing one puts words in a real person's mouth. No portrait, for the
   same reason — none was supplied. */
export function FounderNote({ locale }: { locale: Locale }) {
  return (
    <section className="relative overflow-hidden bg-[#071f1e] text-white">
      <div className="mx-auto max-w-3xl px-5 py-16 text-center md:py-20">
        <Eyebrow>{t(SECTIONS.leadership, locale)}</Eyebrow>
        <h2 className="mt-4 text-2xl font-bold md:text-3xl">{t(STEWARDSHIP.name, locale)}</h2>
        <p className="mt-2 text-sm font-semibold uppercase tracking-widest text-[color:var(--accent)]">
          {t(STEWARDSHIP.role, locale)}
        </p>
        <Ornament className="mx-auto mt-6 max-w-xs" />

        <p className="mt-7 text-base leading-loose text-white/80">{t(STEWARDSHIP.note, locale)}</p>

        <ul className="mt-9 grid gap-3 sm:grid-cols-3">
          {STEWARDSHIP.commitments.map((c) => (
            <li key={c.key} className="rounded-lg border border-white/10 px-4 py-3 text-start">
              <span className="block size-1.5 rotate-45 bg-[color:var(--accent)]" aria-hidden="true" />
              <span className="mt-2 block text-xs font-semibold leading-snug">{t(c.title, locale)}</span>
            </li>
          ))}
        </ul>

        <Link
          href="/cards"
          className="app-gradient mt-9 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-[color:var(--on-accent)] transition hover:opacity-90"
        >
          {t(SECTIONS.viewCard, locale)}
          <span aria-hidden="true" className="rtl:rotate-180">→</span>
        </Link>
      </div>
    </section>
  );
}

/* ── About ────────────────────────────────────────────────────────────────
   No statistics block of invented numbers. The three figures that are
   document-backed — operating since, service lines, countries worked in —
   live on /about, where they can carry their labels. */
export function AboutBlock({ locale }: { locale: Locale }) {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 md:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <Eyebrow>{t(ABOUT.eyebrow, locale)}</Eyebrow>
        <h2 className="mt-4 text-3xl font-bold md:text-4xl">{t(ABOUT.title, locale)}</h2>
        <Ornament className="mx-auto mt-6 max-w-xs" />
        <p className="mt-7 text-base leading-loose text-[color:var(--ink)]/70">{t(ABOUT.body, locale)}</p>
      </div>
    </section>
  );
}

/* ── Careers CTA ──────────────────────────────────────────────────────────
   A call to action, not a vacancies list: there are no job records, and
   nothing here may be invented. */
export function CareersCta({ locale }: { locale: Locale }) {
  return (
    <section className="border-t border-[color:var(--accent)]/20 bg-[color:var(--panel)]">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-5 py-14 text-center md:flex-row md:justify-between md:text-start">
        <div>
          <h2 className="text-2xl font-bold">{t(SECTIONS.careersTitle, locale)}</h2>
          <p className="mt-2 max-w-xl text-sm text-[color:var(--ink)]/70">{t(SECTIONS.careersBody, locale)}</p>
        </div>
        <Link
          href="/careers"
          className="shrink-0 rounded-xl bg-[color:var(--accent)] px-7 py-3 font-bold text-[color:var(--on-accent)] transition hover:opacity-90"
        >
          {t(SECTIONS.careersCta, locale)}
        </Link>
      </div>
    </section>
  );
}
