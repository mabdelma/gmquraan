import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostBySlug } from "@/lib/blog";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Post not found" };
  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    openGraph: { title: post.title, description: post.excerpt ?? undefined, type: "article", images: post.coverImage ? [post.coverImage] : undefined },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-3xl px-5 py-14">
      <Link href="/blog" className="text-sm text-[color:var(--ink)]/50 hover:text-[color:var(--ink)]">← Blog</Link>
      <h1 className="text-3xl md:text-4xl font-extrabold mt-6">{post.title}</h1>
      {post.publishedAt && <div className="text-sm text-[color:var(--ink)]/40 mt-2">{new Date(post.publishedAt).toLocaleDateString()}</div>}
      {post.coverImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.coverImage} alt="" className="w-full rounded-2xl mt-6" />
      )}
      <div className="prose prose-invert max-w-none mt-8 text-[color:var(--ink)]/80 whitespace-pre-line leading-relaxed">{post.body}</div>
    </article>
  );
}
