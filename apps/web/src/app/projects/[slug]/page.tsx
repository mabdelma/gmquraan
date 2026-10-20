import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale } from "@/lib/i18n.server";
import { getProjectBySlug } from "@/lib/projects";
import { Ornament } from "@/components/brand/sections";
import { PRACTICE_AREAS, t, type Bi } from "@/lib/brand-content";

export const dynamic = "force-dynamic";

const STATUS: Record<string, Bi> = {
  PLANNED: { ar: "مخطط له", en: "Planned", es: "Previsto", pt: "Planeado", fr: "Prévu" },
  ONGOING: { ar: "قيد التنفيذ", en: "Ongoing", es: "En curso", pt: "Em curso", fr: "En cours" },
  COMPLETED: { ar: "مكتمل", en: "Completed", es: "Completado", pt: "Concluído", fr: "Achevé" },
};

const BACK: Bi = { ar: "المشاريع", en: "Projects", es: "Proyectos", pt: "Projetos", fr: "Projets" };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return { title: "Project not found" };
  return {
    title: project.title,
    description: project.summary,
    openGraph: { title: project.title, description: project.summary, type: "article", images: project.coverImage ? [project.coverImage] : undefined },
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();
  const locale = await getLocale();
  const area = project.sector ? PRACTICE_AREAS.find((a) => a.slug === project.sector)?.title : null;
  const status = STATUS[project.status] ?? STATUS.ONGOING;

  return (
    <article>
      <section className="border-b border-[color:var(--accent)]/20 bg-[#0c3433] text-white">
        <div className="mx-auto max-w-3xl px-5 py-14 text-center">
          <Link href="/projects" className="text-sm text-white/60 hover:text-white">← {t(BACK, locale)}</Link>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs">
            <span className="rounded-full border border-[color:var(--accent)]/30 bg-[color:var(--accent)]/10 px-2.5 py-0.5 font-semibold text-[color:var(--accent-text)]">
              {t(status, locale)}
            </span>
            {area && <span className="text-white/60">{t(area, locale)}</span>}
          </div>
          <h1 className="mt-4 text-3xl font-bold md:text-4xl">{project.title}</h1>
          {project.publishedAt && <div className="mt-3 text-sm text-white/60">{new Date(project.publishedAt).toLocaleDateString(locale)}</div>}
          <Ornament className="mx-auto mt-6 max-w-xs" />
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-14">
        {project.coverImage && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={project.coverImage} alt="" className="w-full rounded-2xl" />
        )}
        <p className="mt-8 text-lg leading-relaxed text-[color:var(--ink)]/85">{project.summary}</p>
        <div className="prose prose-invert max-w-none mt-6 text-[color:var(--ink)]/80 whitespace-pre-line leading-relaxed">{project.body}</div>
      </section>
    </article>
  );
}
