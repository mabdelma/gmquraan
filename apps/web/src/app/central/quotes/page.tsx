import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { QuoteManager } from "@/components/QuoteManager";

export const dynamic = "force-dynamic";

export default async function CentralQuotesPage() {
  const admin = await getCentralAdmin();
  if (!admin) redirect("/central");
  const rows = await prisma.quote.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
    include: { client: { select: { email: true, name: true } }, solution: { select: { title: true, slug: true } } }
  });
  const quotes = rows.map((q) => ({ ...q, createdAt: q.createdAt.toISOString() }));

  return (
    <section className="mx-auto max-w-4xl px-5 py-10">
      <Link href="/central" className="text-sm text-[color:var(--ink)]/50 hover:text-[color:var(--ink)]">← Console</Link>
      <h1 className="text-2xl font-extrabold mt-3">Quotes & proposals</h1>
      <p className="text-[color:var(--ink)]/50 mt-1 text-sm">Price and send quotes for bespoke service requests.</p>
      <div className="mt-8">
        <QuoteManager initial={quotes} />
      </div>
    </section>
  );
}
