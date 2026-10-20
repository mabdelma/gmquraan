"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CentralLogout } from "./CentralLogout";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import type { CentralMessages } from "@/lib/central-i18n";
import type { Locale } from "@/lib/i18n";
import { BrandLogo } from "./BrandLogo";
import { COMPANY } from "@/lib/content";

export function CentralNav({ who, t, locale }: { who: string; t: CentralMessages; locale: Locale }) {
  const path = usePathname();
  const TABS: [string, string][] = [
    ["/central", t.nav.overview],
    ["/central/revenue", t.nav.revenue],
    ["/central/payouts", t.nav.payouts],
    ["/central/users", t.nav.users],
    ["/central/mail", t.nav.email],
    ["/central/resellers", t.nav.resellers],
    ["/central/solutions", t.nav.solutions],
    ["/central/leads", t.nav.leads],
    ["/central/quotes", "Quotes"],
    ["/central/blog", "Blog"],
    ["/central/projects", "Projects"],
    ["/central/vacancies", "Vacancies"],
    ["/central/analytics", t.nav.analytics],
    ["/central/audit", t.nav.audit],
  ];
  const isActive = (href: string) => (href === "/central" ? path === "/central" : path.startsWith(href));

  return (
    <header className="app-safe-t sticky top-0 z-30 border-b border-[color:var(--hairline)] bg-[color:var(--bg)]/90 backdrop-blur">
      <div className="mx-auto max-w-6xl px-5 py-3 flex items-center gap-4 flex-wrap">
        <Link href="/central" className="flex items-center gap-2 font-extrabold shrink-0">
          <BrandLogo h={26} alt="" />
          <span>
            <span className="app-gradient-text">{COMPANY.wordmarkLead}</span> · Central
          </span>
        </Link>
        <nav className="flex items-center gap-1 flex-wrap flex-1">
          {TABS.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded-lg text-sm transition ${
                isActive(href) ? "bg-[color:var(--accent-text)]/15 text-[color:var(--accent-text)] font-semibold" : "text-[color:var(--ink)]/60 hover:bg-[color:var(--overlay)]"
              }`}
            >
              {label}
            </Link>
          ))}
          <a
            href="https://passive.example.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg text-sm transition text-[color:var(--accent-text)]/80 hover:bg-[color:var(--accent-text)]/10"
            title={t.nav.hub}
          >
            {t.nav.hub} ↗
          </a>
        </nav>
        <span className="text-xs text-[color:var(--ink)]/55 hidden lg:block">{who}</span>
        <ThemeToggle />
          <LanguageSwitcher current={locale} />
        <CentralLogout label={t.signOut} />
      </div>
    </header>
  );
}
