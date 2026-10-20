import Link from "next/link";
import { BrandLogo } from "./BrandLogo";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { getLocale } from "@/lib/i18n.server";
import { getUi, type PortalLabels } from "@/lib/ui-i18n";
import type { PortalMember } from "@/lib/session";
import { isGroupWide } from "@app/core";

/**
 * The portal frame.
 *
 * The sidebar is always present and always usable — it collapses to icons on
 * narrow screens rather than hiding behind a drawer, which is the pattern the
 * console settled on after the drawer proved unreachable on touch devices.
 */

const navFor = (t: PortalLabels) => [
  { href: "/home", label: t.home, icon: HomeIcon },
  { href: "/workspace", label: t.myWorkspace, icon: WorkspaceIcon },
  { href: "/tasks", label: t.myTasks, icon: TaskIcon },
  { href: "/crm", label: t.pipeline, icon: CrmIcon },
  // Finance is shown to everyone and guarded on the page: hiding a link is
  // presentation, and mayKeepLedger is the control.
  { href: "/finance", label: "Ledger", icon: CrmIcon },
  { href: "/repository", label: t.repository, icon: RepoIcon },
  { href: "/documents", label: t.documents, icon: DocIcon },
  { href: "/approvals", label: t.approvals, icon: ApproveIcon },
  { href: "/team", label: t.team, icon: TeamIcon },
  { href: "/org", label: t.organisation, icon: OrgIcon },
  { href: "/departments", label: t.departments, icon: DeptIcon },
  { href: "/leave", label: t.leave, icon: LeaveIcon },
  { href: "/assets", label: t.equipment, icon: AssetIcon },
  { href: "/me", label: t.profile, icon: PersonIcon },
];

export async function Shell({ member, children }: { member: PortalMember; children: React.ReactNode }) {
  const locale = await getLocale();
  const t = getUi(locale);
  const NAV = navFor(t);
  // The People console is for HR and group-wide roles; Administration is
  // group-wide only. Hiding a link is presentation, not access control — both
  // pages check for themselves.
  const nav = [
    ...NAV,
    ...(isGroupWide(member.role) || member.departmentId === "PEO"
      ? [{ href: "/hr", label: t.people, icon: HrIcon }]
      : []),
    ...(isGroupWide(member.role) ? [{ href: "/admin", label: t.administration, icon: AdminIcon }] : []),
  ];

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 z-30 flex h-dvh w-16 shrink-0 flex-col border-r lg:w-60 [border-color:var(--hairline)] [background:var(--panel)]">
        <Link
          href="/home"
          className="flex h-16 items-center justify-center gap-2 px-3 lg:justify-start"
          aria-label="GM-OS home"
        >
          <BrandLogo h={24} />
          <span className="hidden text-sm font-extrabold tracking-tight lg:inline lg:text-base">
            GM<span className="[color:var(--accent-text)]">-OS</span>
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1 px-2 py-2">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:[background:var(--overlay)]"
            >
              <n.icon />
              <span className="hidden lg:inline">{n.label}</span>
            </Link>
          ))}
        </nav>

        <div className="border-t px-2 py-3 [border-color:var(--hairline)]">
          <div className="hidden px-2 pb-2 lg:block">
            <div className="truncate text-sm font-semibold">{member.name}</div>
            <div className="truncate text-xs [color:var(--muted)]">{member.title || member.role}</div>
          </div>
          <div className="mb-2 flex justify-center lg:justify-start lg:px-2">
            <ThemeToggle />
            <LanguageSwitcher current={locale} />
          </div>
          <form action="/api/logout" method="post">
            <button className="w-full rounded-xl px-3 py-2.5 text-left text-sm hover:[background:var(--overlay)]">
              <span className="lg:hidden" aria-hidden="true">
                ⎋
              </span>
              <span className="hidden lg:inline">{t.signOut}</span>
              <span className="sr-only lg:hidden">{t.signOut}</span>
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10">{children}</main>
    </div>
  );
}

/* Inline icons — no icon dependency, and the CSP forbids remote assets. */
const box = "h-5 w-5 shrink-0";
const svg = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

function HomeIcon() {
  return (
    <svg className={box} {...svg} aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5V21H3z" />
    </svg>
  );
}
function TaskIcon() {
  return (
    <svg className={box} {...svg} aria-hidden="true">
      <path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" />
    </svg>
  );
}
function ApproveIcon() {
  return (
    <svg className={box} {...svg} aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
function TeamIcon() {
  return (
    <svg className={box} {...svg} aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 .01M22 21v-2a4 4 0 0 0-3-3.87" />
    </svg>
  );
}
function PersonIcon() {
  return (
    <svg className={box} {...svg} aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 7a4 4 0 1 0 0 .01" />
    </svg>
  );
}
function OrgIcon() {
  return (
    <svg className={box} {...svg} aria-hidden="true">
      <path d="M12 3v4M6 21v-4M18 21v-4M6 17h12M12 7v10M4 17h4v4H4zM16 17h4v4h-4zM10 3h4v4h-4z" />
    </svg>
  );
}

function WorkspaceIcon() {
  return (
    <svg className={box} {...svg} aria-hidden="true">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}

function CrmIcon() {
  return (
    <svg className={box} {...svg} aria-hidden="true">
      <path d="M3 3v18h18M7 15l3-4 3 3 5-7" />
    </svg>
  );
}

function RepoIcon() {
  return (
    <svg className={box} {...svg} aria-hidden="true">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg className={box} {...svg} aria-hidden="true">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h6" />
    </svg>
  );
}

function DeptIcon() {
  return (
    <svg className={box} {...svg} aria-hidden="true">
      <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-5h6v5M9 11h.01M15 11h.01" />
    </svg>
  );
}

function AssetIcon() {
  return (
    <svg className={box} {...svg} aria-hidden="true">
      <path d="M4 7h16v12H4zM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function LeaveIcon() {
  return (
    <svg className={box} {...svg} aria-hidden="true">
      <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
    </svg>
  );
}

function HrIcon() {
  return (
    <svg className={box} {...svg} aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9.5 7a3.5 3.5 0 1 0 0 .01M19 8v6M22 11h-6" />
    </svg>
  );
}

function AdminIcon() {
  return (
    <svg className={box} {...svg} aria-hidden="true">
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
    </svg>
  );
}
