import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "@/lib/i18n.server";
import { getPublishedProjects } from "@/lib/projects";
import { Ornament } from "@/components/brand/sections";
import { PAGE_META, localeMeta, PRACTICE_AREAS, t, type Bi } from "@/lib/brand-content";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  return localeMeta("projects", await getLocale());
}

const UI = {
  eyebrow: { ar: "المشاريع", en: "Projects", es: "Proyectos", pt: "Projetos", fr: "Projets" } as Bi,
  title: { ar: "مشاريعنا", en: "Our projects", es: "Nuestros proyectos", pt: "Os nossos projetos", fr: "Nos projets" } as Bi,
  sub: {
    ar: "المشاريع التي يعتمد المكتب نشرها، مصنّفة حسب مجال العمل.",
    en: "The projects the office has approved for publication, grouped by practice area.", es: "Los proyectos que la oficina ha aprobado para su publicación, agrupados por área de trabajo.", pt: "Os projetos que o gabinete aprovou para publicação, agrupados por área de atuação.", fr: "Les projets que le bureau a approuvés pour publication, regroupés par domaine d'intervention.",
  } as Bi,
  read: { ar: "اقرأ المزيد", en: "Read more", es: "Leer más", pt: "Ler mais", fr: "Lire la suite" } as Bi,
  emptyTitle: { ar: "لم تُنشر مشاريع بعد", en: "No projects published yet", es: "Aún no hay proyectos publicados", pt: "Ainda não há projetos publicados", fr: "Aucun projet publié pour le moment" } as Bi,
  emptyBody: {
    ar: "لا يُنشر مشروع هنا قبل اعتماد العميل والمستندات التي تثبته. حتى ذلك الحين، معرض الأعمال في المركز الإعلامي يُظهر مستوى المخرجات.",
    en: "No project is published here before the client has approved it and the paperwork supports it. Until then, the visual portfolio in the media centre shows the standard of the output.", es: "Aquí no se publica ningún proyecto antes de que el cliente lo apruebe y la documentación lo respalde. Mientras tanto, el portafolio visual de la sala de prensa muestra el nivel del trabajo.", pt: "Aqui não se publica qualquer projeto antes de o cliente o aprovar e a documentação o suportar. Até lá, o portefólio visual no centro de imprensa mostra o nível do trabalho.", fr: "Aucun projet n'est publié ici avant l'accord du client et les pièces qui l'appuient. En attendant, le portfolio visuel de l'espace presse montre le niveau du travail.",
  } as Bi,
  emptyCta: { ar: "معرض الأعمال", en: "See the visual portfolio", es: "Ver el portafolio visual", pt: "Ver o portefólio visual", fr: "Voir le portfolio visuel" } as Bi,
};

const STATUS: Record<string, Bi> = {
  PLANNED: { ar: "مخطط له", en: "Planned", es: "Previsto", pt: "Planeado", fr: "Prévu" },
  ONGOING: { ar: "قيد التنفيذ", en: "Ongoing", es: "En curso", pt: "Em curso", fr: "En cours" },
  COMPLETED: { ar: "مكتمل", en: "Completed", es: "Completado", pt: "Concluído", fr: "Achevé" },
};

/**
 * Projects.
 *
 * Reads the Project model (authored at /central/projects). Nothing is seeded,
 * so until the first project is published the page shows the honest empty
 * state rather than invented business.
 */
export default async function ProjectsPage() {
  const locale = await getLocale();
  const projects = await getPublishedProjects().catch(() => []);
  // `sector` on the Project model is a practice-area slug now; the lookup is
  // what keeps a published project's tag in step with /services.
  const areaTitle = (slug: string | null) =>
    slug ? (PRACTICE_AREAS.find((a) => a.slug === slug)?.title ?? null) : null;

  return (
    <>
      <section className="border-b border-[color:var(--accent)]/20 bg-[#0c3433] text-white">
        <div className="mx-auto max-w-6xl px-5 py-14 text-center">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--accent)]">
            {t(UI.eyebrow, locale)}
          </div>
          <h1 className="mt-4 text-3xl font-bold md:text-4xl">{t(UI.title, locale)}</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/70">{t(UI.sub, locale)}</p>
          <Ornament className="mx-auto mt-6 max-w-xs" />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        {projects.length === 0 ? (
          <div className="mx-auto max-w-lg rounded-xl border border-[color:var(--hairline)] bg-[color:var(--panel)] p-10 text-center">
            <span className="mx-auto block size-2 rotate-45 bg-[color:var(--accent)]" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-bold">{t(UI.emptyTitle, locale)}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[color:var(--ink)]/65">{t(UI.emptyBody, locale)}</p>
            <Link
              href="/media"
              className="mt-5 inline-block text-sm font-semibold text-[color:var(--accent-text)] hover:underline"
            >
              {t(UI.emptyCta, locale)} <span aria-hidden="true">›</span>
            </Link>
          </div>
        ) : (
          <div className="grid auto-rows-fr gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => {
              const area = areaTitle(p.sector);
              const status = STATUS[p.status] ?? STATUS.ONGOING;
              return (
                <article
                  key={p.slug}
                  className="app-reveal flex flex-col overflow-hidden rounded-xl border border-[color:var(--hairline)] bg-[color:var(--panel)]"
                >
                  {p.coverImage && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={p.coverImage} alt="" aria-hidden="true" loading="lazy" className="aspect-[16/9] w-full object-cover" />
                  )}
                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="rounded-full border border-[color:var(--accent)]/30 bg-[color:var(--accent)]/10 px-2.5 py-0.5 font-semibold text-[color:var(--accent-text)]">
                        {t(status, locale)}
                      </span>
                      {area && <span className="text-[color:var(--ink)]/50">{t(area, locale)}</span>}
                    </div>
                    <h2 className="mt-3 text-lg font-bold leading-snug">{p.title}</h2>
                    <p className="mt-2 flex-1 text-sm text-[color:var(--ink)]/65">{p.summary}</p>
                    <Link href={`/projects/${p.slug}`} className="mt-4 text-sm font-semibold text-[color:var(--accent-text)] hover:underline">
                      {t(UI.read, locale)} <span aria-hidden="true">›</span>
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
