import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { categoryLabel, formatPrice } from "@/lib/format";
import { PublishToggle } from "@/components/PublishToggle";
import { FeaturedToggle } from "@/components/FeaturedToggle";
import { DeleteSolutionButton } from "@/components/DeleteSolutionButton";
import { getLocale } from "@/lib/i18n.server";
import { getCentralPages } from "@/lib/central-pages-i18n";
import { getDeleteLabels } from "@/lib/ui-i18n";
import { translateBatch } from "@/lib/translate";

export const dynamic = "force-dynamic";

export default async function CentralSolutionsPage() {
  const admin = await getCentralAdmin();
  if (!admin) redirect("/central");

  const solutions = await prisma.solution.findMany({
    orderBy: [{ published: "desc" }, { createdAt: "desc" }],
    select: { id: true, slug: true, title: true, category: true, price: true, currency: true, published: true, featured: true, vendorName: true, code: true },
  });

  const locale = await getLocale();
  const cp = getCentralPages(locale);
  const del = getDeleteLabels(locale);
  const [tHidden, tFeatured] = await translateBatch(["Hidden", "Featured"], locale);
  const pending = solutions.filter((s) => !s.published);
  const live = solutions.filter((s) => s.published);

  const row = (s: (typeof solutions)[number]) => (
    <li key={s.id} className="panel rounded-xl p-4 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <Link href={`/marketplace/${s.slug}`} className="font-semibold hover:text-[color:var(--accent-text)]">
          {s.title}
        </Link>
        <div className="text-xs text-[color:var(--ink)]/55 truncate">
          <span className="font-mono text-[color:var(--accent-text)]/80">{s.code || s.id.slice(0, 8)}</span> · {categoryLabel(s.category)} ·{" "}
          {s.vendorName || "—"} · {s.published ? cp.sol.live : cp.sol.pending}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-sm">{formatPrice(s.price, s.currency)}</span>
        <Link href={`/central/solutions/${s.id}/edit`} className="text-xs border border-[color:var(--hairline)] rounded-lg px-2.5 py-1 hover:bg-[color:var(--overlay)]">
          {cp.edit}
        </Link>
        <PublishToggle id={s.id} published={s.published} labels={{ publish: cp.sol.live, unpublish: tHidden }} />
        <FeaturedToggle id={s.id} featured={s.featured} label={tFeatured} />
        <DeleteSolutionButton id={s.id} title={s.title} t={del} />
      </div>
    </li>
  );

  return (
    <section className="mx-auto max-w-5xl px-5 py-10">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-extrabold">{cp.sol.title}</h1>
        <Link
          href="/central/solutions/new"
          className="app-gradient text-[color:var(--on-accent)] font-bold rounded-lg px-4 py-2 text-sm shrink-0"
        >
          {cp.sol.addSolution}
        </Link>
      </div>
      <p className="text-[color:var(--ink)]/50 mt-1 text-sm">{cp.sol.subtitle}</p>

      <h2 className="font-bold text-sm text-[color:var(--accent-text)] mt-8 mb-2">
        {cp.sol.pending} <span className="text-[color:var(--ink)]/55">({pending.length})</span>
      </h2>
      {pending.length === 0 ? (
        <p className="text-[color:var(--ink)]/55 text-sm panel rounded-xl p-4">{cp.sol.nothingPending}</p>
      ) : (
        <ul className="space-y-3">{pending.map(row)}</ul>
      )}

      <h2 className="font-bold text-sm text-emerald-300 mt-10 mb-2">
        {cp.sol.live} <span className="text-[color:var(--ink)]/55">({live.length})</span>
      </h2>
      <ul className="space-y-3">{live.map(row)}</ul>
    </section>
  );
}
