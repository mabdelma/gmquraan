import { redirect } from "next/navigation";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { getLocale } from "@/lib/i18n.server";
import { getCentralPages } from "@/lib/central-pages-i18n";
import { getCentralForms } from "@/lib/central-forms-i18n";
import { UserManager } from "@/components/UserManager";
import { CsvUserImport } from "@/components/CsvUserImport";

export const dynamic = "force-dynamic";

export default async function CentralUsersPage() {
  const admin = await getCentralAdmin();
  if (!admin) redirect("/central");

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
    select: { id: true, email: true, name: true, role: true, plan: true, createdAt: true },
    take: 2000,
  });

  const rows = users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }));
  const isSuper = admin.role === "SUPER_ADMIN";
  const locale = await getLocale();
  const c = getCentralPages(locale).usr;
  const forms = getCentralForms(locale);
  const fm = forms.um;

  return (
    <section className="mx-auto max-w-5xl px-5 py-10">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-extrabold">{c.title}</h1>
        <CsvUserImport t={forms.ci} />
      </div>
      <p className="text-[color:var(--ink)]/50 mt-2 text-sm">{isSuper ? c.subtitleSuper : c.subtitleAdmin}</p>

      <div className="mt-8">
        <UserManager users={rows} isSuper={isSuper} selfId={admin.id} t={fm} />
      </div>
    </section>
  );
}
