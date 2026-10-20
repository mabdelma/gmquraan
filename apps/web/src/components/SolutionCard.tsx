import Link from "next/link";
import { categoryLabel, formatPrice } from "@/lib/format";

type Solution = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  price: number;
  currency: string;
  region: string;
  whiteLabel: boolean;
  featured: boolean;
  vendorName: string | null;
  url?: string | null;
  images?: string[];
};

type Labels = {
  catLabels?: Record<string, string>;
  contactPricing?: string;
  featured?: string;
  live?: string;
};

export function SolutionCard({ s, t }: { s: Solution; t?: Labels }) {
  return (
    <Link
      href={`/marketplace/${s.slug}`}
      className="panel rounded-2xl p-6 flex flex-col hover:border-[color:var(--accent-text)]/40 transition group"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[color:var(--accent-text)]/90">{categoryLabel(s.category, t?.catLabels)}</span>
        <div className="flex items-center gap-2">
          {s.url && (
            <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" /> {t?.live ?? "Live"}
            </span>
          )}
          {s.featured && (
            <span className="text-xs uppercase tracking-widest app-gradient text-[color:var(--on-accent)] font-bold px-2 py-0.5 rounded">
              {t?.featured ?? "Featured"}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 mt-3">
        {s.images?.[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.images[0]} alt="" width={28} height={28} className="rounded-md bg-[color:var(--overlay)] p-0.5" />
        )}
        <h3 className="font-bold text-lg group-hover:text-[color:var(--accent-text)]">{s.title}</h3>
      </div>
      <p className="text-[color:var(--ink)]/60 text-sm mt-2 flex-1">{s.summary}</p>
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-[color:var(--hairline)]">
        <span className="text-sm font-semibold">{formatPrice(s.price, s.currency, t?.contactPricing)}</span>
        <span className="text-xs text-[color:var(--ink)]/55">{s.region}</span>
      </div>
    </Link>
  );
}
