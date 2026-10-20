import Link from "next/link";
import { getLocale } from "@/lib/i18n.server";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { BrandLogo } from "./BrandLogo";
import { brandFor } from "@/lib/content";
import { SECTIONS, SITE_NAV, t as pick } from "@/lib/brand-content";
import { MobileMenu } from "./brand/MobileMenu";
import { headers } from "next/headers";

export async function Nav() {
  const locale = await getLocale();

  // The public navigation. The marketplace/hub/core routes belonged to the
  // previous product and are not deleted — they remain routable — they are
  // simply no longer the office's primary navigation.
  const links = SITE_NAV.map((n) => ({ href: n.href, label: pick(n.label, locale) }));
  const brand = brandFor(locale);
  const pathname = (await headers()).get("x-pathname") || "/";
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="app-safe-t sticky top-0 z-50 backdrop-blur border-b border-[color:var(--hairline)] bg-[color:var(--surface)]/80">
      <nav className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between">
        {/* The wordmark is ~180px; with the controls on the right it pushed the
            document to 396px on a 360px phone, so every page scrolled sideways.
            Below sm the mark alone carries the brand. Rendered through
            brandFor() so Arabic shows the Arabic name, like every other
            string on the bar. */}
        <Link
          href="/"
          className="flex items-center gap-2.5 font-display font-extrabold tracking-tight text-lg min-w-0 shrink"
          aria-label={brand.name}
        >
          <BrandLogo h={32} alt={brand.name} />
          {/* leading-none drops the line box onto the cap height so the roundel
              centres on the letters, not on empty leading. */}
          <span className="hidden sm:inline leading-none whitespace-nowrap">
            <span className="app-gradient-text">{brand.lead}</span>
            <span className="text-[color:var(--ink)]/80"> {brand.rest}</span>
          </span>
        </Link>
        <div className="hidden md:flex items-center gap-6 text-sm text-[color:var(--ink)]/70">
          {links.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={isActive(n.href) ? "page" : undefined}
              className={`relative py-5 transition hover:text-[color:var(--ink)] ${
                isActive(n.href) ? "text-[color:var(--ink)]" : ""
              }`}
            >
              {n.label}
              {/* Gold underline on the current page, per the reference header. */}
              <span
                aria-hidden="true"
                className={`absolute inset-x-0 bottom-0 h-0.5 bg-[color:var(--accent)] transition-opacity ${
                  isActive(n.href) ? "opacity-100" : "opacity-0"
                }`}
              />
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <ThemeToggle />
          <LanguageSwitcher current={locale} />
          <MobileMenu
            links={links}
            label={pick(SECTIONS.menu, locale)}
            closeLabel={pick(SECTIONS.close, locale)}
          />
        </div>
      </nav>
    </header>
  );
}
