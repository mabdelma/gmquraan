import Link from "next/link";
import { redirect } from "next/navigation";
import { getCentralAdmin } from "@/lib/central-session";
import { SERVICES } from "@/lib/content";
import { getLocale } from "@/lib/i18n.server";
import { getAppMessages } from "@/lib/app-messages";
import { getCentralPages } from "@/lib/central-pages-i18n";
import { getSolutionFormMessages } from "@/lib/solution-form-i18n";
import { NewSolutionForm } from "@/components/NewSolutionForm";

export const dynamic = "force-dynamic";

export default async function CentralNewSolutionPage() {
  const admin = await getCentralAdmin();
  if (!admin) redirect("/central");

  const locale = await getLocale();
  const app = getAppMessages(locale);
  const t = app.partnerNew;
  const cp = getCentralPages(locale).sol;
  const categories = SERVICES.map((sv) => ({ key: sv.key, title: app.categories[sv.key] }));

  return (
    <section className="mx-auto max-w-2xl px-5 py-10">
      <Link href="/central/solutions" className="text-sm text-[color:var(--ink)]/50 hover:text-[color:var(--ink)]">← {cp.title}</Link>
      <h1 className="text-2xl font-extrabold mt-3">{cp.addSolution}</h1>
      <p className="text-[color:var(--ink)]/50 mt-1 text-sm">{t.subtitle}</p>
      <NewSolutionForm
        t={t}
        licenses={app.licenses}
        categories={categories}
        endpoint="/api/central/solutions"
        doneHref="/central/solutions"
        x={getSolutionFormMessages(locale)}
      />
    </section>
  );
}
