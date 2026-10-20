"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { CentralLogout } from "./CentralLogout";
import type { Locale } from "@/lib/i18n";
import { getAriaLabels } from "@/lib/ui-i18n";
import { BrandLogo } from "./BrandLogo";
import { COMPANY } from "@/lib/content";

export type NavItem = { href: string; label: string; icon: string; external?: boolean };

/**
 * Console shell shared by /central.
 *
 * The sidebar is **always present and always usable** — there is no collapse
 * toggle and no off-canvas drawer, so navigation can never end up hidden behind
 * a menu or stuck in an icon-only state.
 *
 * It adapts by width rather than by being hidden:
 *  - below `lg` it is a 64px rail: icons only, labels off, still every
 *    destination one tap away;
 *  - from `lg` up it widens to 240px and the labels appear.
 *
 * It sticks to the viewport and scrolls internally, so a long nav stays
 * reachable without scrolling the page content.
 */
export function DashboardShell({
  items,
  brand,
  homeHref,
  who,
  locale,
  signOutLabel,
  children,
}: {
  items: NavItem[];
  brand: string;
  homeHref: string;
  who?: string;
  locale: Locale;
  signOutLabel: string;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const aria = getAriaLabels(locale);

  const isActive = (href: string) => (href === homeHref ? path === homeHref : path.startsWith(href));

  // Icon-only at rail width, so the accessible name has to carry the label.
  const linkBase =
    "flex items-center gap-3 rounded-lg text-sm transition min-h-11 px-2 lg:px-3 justify-center lg:justify-start";

  return (
    <div className="flex app-minh">
      <aside
        aria-label={aria.dashboardNav}
        className="sticky top-0 z-30 flex h-dvh w-16 shrink-0 flex-col border-r border-[color:var(--hairline)] bg-[color:var(--bg)] lg:w-60"
      >
        <div className="flex items-center gap-2 border-b border-[color:var(--hairline)] px-2 py-4 lg:px-4">
          <Link
            href={homeHref}
            className="flex min-h-11 w-full min-w-0 items-center justify-center gap-2 font-extrabold lg:justify-start"
          >
            <BrandLogo h={26} className="shrink-0" alt="" />
            <span className="hidden truncate lg:inline">
              <span className="app-gradient-text">{COMPANY.wordmarkLead}</span> {brand}
            </span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
          {items.map((it) => {
            // A route handler is never a client-side navigation. next/link
            // prefetches whatever is in the viewport, so merely opening the
            // console fired the portal handoff and burned its sixty-second
            // token before anybody clicked it; then the click asked the App
            // Router to follow a 303 to another origin, which it cannot do, so
            // it resolved against the current one. Both failures look exactly
            // like the team portal being served from the wrong place.
            const routeHandler = it.href.startsWith("/api/");
            return it.external || routeHandler ? (
              <a
                key={it.href}
                href={it.href}
                // Only genuinely external destinations open a tab. A handoff is
                // a full-page navigation in this one, which is what "take me to
                // the portal" means.
                {...(it.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                title={it.label}
                aria-label={it.label}
                className={`${linkBase} ${
                  it.external
                    ? "text-[color:var(--accent-text)]/80 hover:bg-[color:var(--accent-text)]/10"
                    : "text-[color:var(--ink)]/60 hover:bg-[color:var(--overlay)]"
                }`}
              >
                <span className="shrink-0 text-lg">{it.icon}</span>
                <span className="hidden truncate lg:inline">
                  {it.label}
                  {it.external ? " ↗" : ""}
                </span>
              </a>
            ) : (
              <Link
                key={it.href}
                href={it.href}
                title={it.label}
                aria-label={it.label}
                aria-current={isActive(it.href) ? "page" : undefined}
                className={`${linkBase} ${
                  isActive(it.href)
                    ? "bg-[color:var(--accent-text)]/15 font-semibold text-[color:var(--accent-text)]"
                    : "text-[color:var(--ink)]/60 hover:bg-[color:var(--overlay)]"
                }`}
              >
                <span className="shrink-0 text-lg">{it.icon}</span>
                <span className="hidden truncate lg:inline">{it.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="space-y-2 border-t border-[color:var(--hairline)] p-2 lg:p-3">
          {who && <div className="hidden truncate px-1 text-xs text-[color:var(--ink)]/55 lg:block">{who}</div>}
          {/* Stacked in the rail, inline once there is room for labels. */}
          <div className="flex flex-col items-stretch gap-2 lg:flex-row lg:items-center">
            <ThemeToggle />
            <LanguageSwitcher current={locale} />
            <CentralLogout label={signOutLabel} shortLabel="⎋" />
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
