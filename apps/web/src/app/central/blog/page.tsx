import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { getLocale } from "@/lib/i18n.server";
import { PostManager } from "@/components/PostManager";

export const dynamic = "force-dynamic";

export default async function CentralBlogPage() {
  const admin = await getCentralAdmin();
  if (!admin) redirect("/central");
  const posts = await prisma.post.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  const locale = await getLocale();

  return (
    <section className="mx-auto max-w-3xl px-5 py-10">
      <Link href="/central" className="text-sm text-[color:var(--ink)]/50 hover:text-[color:var(--ink)]">← Console</Link>
      <h1 className="text-2xl font-extrabold mt-3">Blog</h1>
      <p className="text-[color:var(--ink)]/50 mt-1 text-sm">Write and publish posts to /blog.</p>
      <div className="mt-8">
        <PostManager initial={posts} locale={locale} />
      </div>
    </section>
  );
}
