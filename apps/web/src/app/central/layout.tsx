import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCentralAdmin } from "@/lib/central-session";
import { DashboardShell, type NavItem } from "@/components/DashboardShell";
import { getLocale } from "@/lib/i18n.server";
import { getCentralMessages } from "@/lib/central-i18n";

export const dynamic = "force-dynamic";

/** Central console shell: a collapsible, mobile-friendly sidebar. The login page
 *  (/central, no admin) renders bare; sub-pages hard-redirect to it. */
export default async function CentralLayout({ children }: { children: React.ReactNode }) {
  const admin = await getCentralAdmin();
  if (!admin) {
    // Fail fast on protected sub-pages (clean 307); /central itself shows the login form.
    const pathname = (await headers()).get("x-pathname") || "";
    if (pathname !== "/central") redirect("/central");
    return <>{children}</>;
  }
  const locale = await getLocale();
  const t = getCentralMessages(locale);
  const n = t.nav;
  const items: NavItem[] = [
    { href: "/central", label: n.overview, icon: "🏠" },
    { href: "/central/revenue", label: n.revenue, icon: "💰" },
    { href: "/central/payouts", label: n.payouts, icon: "💸" },
    { href: "/central/users", label: n.users, icon: "👥" },
    { href: "/central/mail", label: n.email, icon: "✉️" },
    { href: "/central/resellers", label: n.resellers, icon: "🤝" },
    { href: "/central/solutions", label: n.solutions, icon: "🧩" },
    { href: "/central/leads", label: n.leads, icon: "📨" },
    { href: "/central/analytics", label: n.analytics, icon: "📊" },
    { href: "/central/workforce", label: n.workforce, icon: "👷" },
    // Hands the signed-in admin across to the team portal on a sixty-second
    // signed token. Not a shared cookie — see the handoff route for why.
    { href: "/api/central/portal-handoff", label: "Team portal", icon: "🗂️" },
    { href: "/central/branches", label: n.branches, icon: "🏢" },
    { href: "/central/site-content", label: n.site, icon: "🧱" },
    { href: "/central/audit", label: n.audit, icon: "🧾" },
    { href: "/hub", label: n.hub, icon: "🛰️" },
  ];
  return (
    <DashboardShell
      items={items}
      brand="Central"
      homeHref="/central"
      who={`${admin.name || admin.email} · ${admin.role}`}
      locale={locale}
      signOutLabel={t.signOut}
    >
      {children}
    </DashboardShell>
  );
}
