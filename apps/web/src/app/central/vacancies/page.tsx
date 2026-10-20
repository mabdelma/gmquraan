import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { getLocale } from "@/lib/i18n.server";
import { getCentralContent } from "@/lib/central-content-i18n";
import { VacancyManager } from "@/components/VacancyManager";

export const dynamic = "force-dynamic";

export default async function CentralVacanciesPage() {
  const admin = await getCentralAdmin();
  if (!admin) redirect("/central");
  const vacancies = await prisma.vacancy.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  const locale = await getLocale();
  const t = getCentralContent(locale).vacancies;
  const m = getCentralContent(locale).m;

  return (
    <section className="mx-auto max-w-3xl px-5 py-10">
      <Link href="/central" className="text-sm text-[color:var(--ink)]/50 hover:text-[color:var(--ink)]">← Console</Link>
      <h1 className="text-2xl font-extrabold mt-3">{t.title}</h1>
      <p className="text-[color:var(--ink)]/50 mt-1 text-sm">{t.subtitle}</p>
      <div className="mt-8">
        <VacancyManager initial={vacancies} t={m} />
      </div>
    </section>
  );
}
