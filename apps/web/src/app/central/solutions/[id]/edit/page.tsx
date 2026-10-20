import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { SERVICES } from "@/lib/content";
import { getLocale } from "@/lib/i18n.server";
import { getAppMessages } from "@/lib/app-messages";
import { getCentralPages } from "@/lib/central-pages-i18n";
import { getSolutionFormMessages } from "@/lib/solution-form-i18n";
import { NewSolutionForm } from "@/components/NewSolutionForm";

export const dynamic = "force-dynamic";

export default async function CentralSolutionEditPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getCentralAdmin();
  if (!admin) redirect("/central");
  const { id } = await params;
  const s = await prisma.solution.findUnique({ where: { id } });
  if (!s) notFound();

  const locale = await getLocale();
  const app = getAppMessages(locale);
  const t = app.partnerNew;
  const x = getSolutionFormMessages(locale);
  const cp = getCentralPages(locale).sol;
  const categories = SERVICES.map((sv) => ({ key: sv.key, title: app.categories[sv.key] }));

  return (
    <section className="mx-auto max-w-2xl px-5 py-10">
      <Link href="/central/solutions" className="text-sm text-[color:var(--ink)]/50 hover:text-[color:var(--ink)]">← {cp.title}</Link>
      <h1 className="text-2xl font-extrabold mt-3">{s.title}</h1>
      <p className="text-[color:var(--ink)]/50 mt-1 text-sm">
        {x.appId} <span className="font-mono text-[color:var(--accent-text)]">{s.code || s.id}</span> ·{" "}
        {s.published ? x.live : x.pending}
      </p>
      <NewSolutionForm
        t={t}
        licenses={app.licenses}
        categories={categories}
        editId={s.id}
        endpoint="/api/central/solutions"
        doneHref="/central/solutions"
        submitLabel={x.saveChanges}
        x={x}
        showLiveStatus
        defaults={{
          title: s.title,
          summary: s.summary,
          description: s.description,
          price: s.price,
          category: s.category,
          licenseModel: s.licenseModel,
          region: s.region,
          vendorName: s.vendorName,
          tags: s.tags,
          techStack: s.techStack,
          whiteLabel: s.whiteLabel,
          partnerSharePercent: s.partnerSharePercent,
          images: s.images,
          url: s.url,
          published: s.published,
        }}
      />
    </section>
  );
}
