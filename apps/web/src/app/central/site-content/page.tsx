import { redirect } from "next/navigation";
import { getCentralAdmin } from "@/lib/central-session";
import { getLocale } from "@/lib/i18n.server";
import { getCentralPages } from "@/lib/central-pages-i18n";
import { getAllStoredCards } from "@/lib/site-cards";
import { SiteContentManager } from "@/components/SiteContentManager";

export const dynamic = "force-dynamic";

export default async function CentralSiteContentPage() {
  const admin = await getCentralAdmin();
  if (!admin) redirect("/central");

  const cards = await getAllStoredCards();
  const c = getCentralPages(await getLocale()).sc;

  return (
    <section className="mx-auto max-w-5xl px-5 py-10">
      <h1 className="text-2xl font-extrabold">{c.title}</h1>
      <p className="[color:var(--muted)] mt-2 text-sm">{c.subtitle}</p>
      <div className="mt-8">
        <SiteContentManager cards={cards} />
      </div>
    </section>
  );
}
