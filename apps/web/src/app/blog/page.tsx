import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedPosts } from "@/lib/blog";
import { getLocale } from "@/lib/i18n.server";
import type { Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";
import { PAGE_META, localeMeta } from "@/lib/brand-content";

export async function generateMetadata(): Promise<Metadata> {
  return localeMeta("blog", await getLocale());
}

const T: Record<Locale, { h1: string; sub: string; empty: string }> = {
  en: { h1: "Blog", sub: "Engineering articles and insights from Example Company.", empty: "No posts yet — check back soon." },
  es: { h1: "Blog", sub: "Artículos y análisis de ingeniería de Example Company.", empty: "Aún no hay publicaciones — vuelve pronto." },
  fr: { h1: "Blog", sub: "Articles et analyses d'ingénierie d'Example Company.", empty: "Pas encore d'articles — revenez bientôt." },
  
  pt: { h1: "Blog", sub: "Artigos e análises de engenharia da Example Company.", empty: "Ainda sem posts — volte em breve." },

  ar: { h1: "المدوّنة", sub: "مقالات ورؤى هندسية من شركة مثال.", empty: "لا مقالات بعد — تحقّق قريبًا." }

  
};

export default async function BlogPage() {
  const posts = await getPublishedPosts();
  const locale = await getLocale();
  const t = T[locale] ?? T.en;

  return (
    <section className="mx-auto max-w-5xl px-5 py-14">
      <h1 className="text-3xl md:text-4xl font-extrabold">{t.h1}</h1>
      <p className="text-[color:var(--ink)]/60 mt-3">{t.sub}</p>

      {posts.length === 0 ? (
        <p className="text-[color:var(--ink)]/50 mt-10 panel rounded-2xl p-10 text-center">{t.empty}</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-10">
          {posts.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="panel rounded-2xl overflow-hidden hover:border-[color:var(--accent-text)]/40 transition flex flex-col">
              {p.coverImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.coverImage} alt="" className="w-full h-40 object-cover" />
              )}
              <div className="p-5 flex-1 flex flex-col">
                <h2 className="font-bold text-lg">{p.title}</h2>
                {p.excerpt && <p className="text-[color:var(--ink)]/60 text-sm mt-2 flex-1">{p.excerpt}</p>}
                {p.publishedAt && <div className="text-xs text-[color:var(--ink)]/40 mt-3">{new Date(p.publishedAt).toLocaleDateString()}</div>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
