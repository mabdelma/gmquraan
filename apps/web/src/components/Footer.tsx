import Link from "next/link";
import { COMPANY, REGISTRATION, brandFor } from "@/lib/content";
import { ABOUT, SITE_NAV, t as pick } from "@/lib/brand-content";
import { resolveBranches, formatAddress } from "@/lib/branches";
import { getLocale } from "@/lib/i18n.server";
import { getMessages } from "@/lib/messages";
import { getUi } from "@/lib/ui-i18n";
import { BrandLogo } from "./BrandLogo";
import { IconMail, IconPhone, IconPin, IconCard } from "./brand/icons";

export async function Footer() {
  const branches = await resolveBranches();
  const locale = await getLocale();
  const m = getMessages(locale);
  const ui = getUi(locale);
  const t = m.footer;

  // Same list as the header, so the two cannot drift apart.
  const links = SITE_NAV.map((n) => ({ href: n.href, label: pick(n.label, locale) }));
  const brand = brandFor(locale);
  const legal = [
    { href: "/privacy", label: t.privacy },
    { href: "/terms", label: t.terms },
    { href: "/sitemap.xml", label: t.sitemap },
  ];



  return (
    <footer className="border-t border-[color:var(--hairline)] mt-24">
      <div className="mx-auto max-w-6xl px-5 py-12 grid gap-8 md:grid-cols-3 text-sm">
        <div>
          <div className="flex items-center gap-2.5 font-display font-extrabold tracking-tight text-lg">
            <BrandLogo h={28} alt={brand.name} />
            {/* Read from brandFor() rather than typed out, which is how the old
                wordmark survived a rename everywhere else on the page — and how
                Arabic gets the brand's Arabic name. leading-none keeps the
                roundel centred on the cap height, matching the header. */}
            <span className="leading-none">
              <span className="app-gradient-text">{brand.lead}</span>{" "}
              <span className="text-[color:var(--ink)]/80">{brand.rest}</span>
            </span>
          </div>
          {/* The association's own line, from the reviewed brand copy. */}
          <p className="text-[color:var(--ink)]/60 mt-2">{pick(ABOUT.title, locale)}</p>
          {/* Registration line: no. 224 of 1977, Sahel Selim. */}
          <p className="text-[color:var(--ink)]/55 mt-3">{t.founded}</p>
        </div>
        <div>
          <div className="font-semibold text-[color:var(--ink)]/80 mb-3">{t.explore}</div>
          <ul className="space-y-2 text-[color:var(--ink)]/60">
            {links.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="hover:text-[color:var(--ink)]">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="font-semibold text-[color:var(--ink)]/80 mb-3">{t.getInTouch}</div>
          <ul className="space-y-3 text-[color:var(--ink)]/65">
            <li className="flex items-start gap-2.5">
              <IconMail className="mt-0.5 size-4 shrink-0 text-[color:var(--accent)]" />
              <a href={`mailto:${COMPANY.email}`} className="hover:text-[color:var(--ink)]">
                {COMPANY.email}
              </a>
            </li>
            {COMPANY.phones.map((p) => (
              <li key={p} className="flex items-start gap-2.5">
                <IconPhone className="mt-0.5 size-4 shrink-0 text-[color:var(--accent)]" />
                <a href={`tel:${p.replace(/[^+\d]/g, "")}`} className="hover:text-[color:var(--ink)]" dir="ltr">
                  {p}
                </a>
              </li>
            ))}
            <li className="flex items-start gap-2.5 leading-relaxed">
              <IconPin className="mt-0.5 size-4 shrink-0 text-[color:var(--accent)]" />
              <span>{pick(REGISTRATION.registeredOfficeLoc, locale)}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <IconCard className="mt-0.5 size-4 shrink-0 text-[color:var(--accent)]" />
              <Link href="/cards" className="hover:text-[color:var(--ink)]">
                {t.digitalCard}
              </Link>
            </li>
          </ul>
          <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[color:var(--ink)]/55">
            {legal.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-[color:var(--ink)]">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-[color:var(--hairline)] py-5 text-center text-xs text-[color:var(--ink)]/55 space-y-1">
        {/* Developer credit. dir="ltr" keeps the Latin brand and year from being
            reordered by the bidi algorithm on the Arabic pages. */}
        <div dir="ltr" className="space-y-1">
          <div>
            {t.developedBy}{" "}
            <a
              href="https://gmquran.com"
              target="_blank"
              rel="noopener"
              className="hover:text-[color:var(--accent-text)]"
            >
              gmquran.com
            </a>
          </div>
          <div>
            © {new Date().getFullYear()} {COMPANY.name} — {t.rights}
          </div>
        </div>
        {/* Entities come from /central/branches, so adding one there shows here. */}
        <div className="text-[color:var(--ink)]/55 space-y-0.5">
          {branches.map((b) => (
            <div key={b.slug}>
              {b.flag} {b.legalName}
              {b.legalForm ? ` · ${b.legalForm}` : ""}
              {b.registrationLabel && b.registrationNo ? ` · ${b.registrationLabel} ${b.registrationNo}` : ""}
              {` · ${formatAddress(b)}`}
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
