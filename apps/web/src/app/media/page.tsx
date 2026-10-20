/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@app/db";
import { getLocale } from "@/lib/i18n.server";
import { Ornament } from "@/components/brand/sections";
import { PAGE_META, localeMeta, t, type Bi } from "@/lib/brand-content";
import { ALL_MEDIA, MEDIA_CLIPS, MEDIA_COLLECTIONS } from "@/lib/gallery";

export async function generateMetadata(): Promise<Metadata> {
  return localeMeta("media", await getLocale());
}

const UI = {
  eyebrow: { ar: "المركز الإعلامي", en: "Media Centre", es: "Sala de prensa", pt: "Centro de imprensa", fr: "Espace presse" } as Bi,
  title: { ar: "أعمالنا وأخبارنا", en: "Our work and our news", es: "Nuestro trabajo y nuestras noticias", pt: "O nosso trabalho e as nossas notícias", fr: "Nos travaux et nos actualités" } as Bi,
  lede: {
    ar: "أعمال الإظهار المعماري والهندسي التي ينتجها المكتب، ثم ما يُنشر من أخبار وإعلانات.",
    en: "The architectural and engineering visualisation the office produces, followed by any published news and announcements.", es: "La visualización arquitectónica y de ingeniería que produce la oficina, seguida de las noticias y anuncios publicados.", pt: "A visualização arquitetónica e de engenharia que o gabinete produz, seguida das notícias e anúncios publicados.", fr: "La visualisation architecturale et technique produite par le bureau, suivie des actualités et annonces publiées.",
  } as Bi,
  galleryTitle: { ar: "معرض الأعمال", en: "Visual portfolio", es: "Portafolio visual", pt: "Portefólio visual", fr: "Portfolio visuel" } as Bi,
  stills: { ar: "لقطة", en: "stills", es: "imágenes", pt: "imagens", fr: "images" } as Bi,
  clipsLabel: { ar: "مقطع", en: "clips", es: "vídeos", pt: "vídeos", fr: "séquences" } as Bi,
  clipsTitle: { ar: "جولات متحركة", en: "Animated walkthroughs", es: "Recorridos animados", pt: "Percursos animados", fr: "Visites animées" } as Bi,
  noVideo: { ar: "متصفحك لا يدعم تشغيل الفيديو.", en: "Your browser cannot play this video.", es: "Su navegador no puede reproducir este vídeo.", pt: "O seu navegador não consegue reproduzir este vídeo.", fr: "Votre navigateur ne peut pas lire cette vidéo." } as Bi,
  /**
   * The disclosure that makes the gallery honest. It is on the page, not in a
   * source comment: a visitor looking at renders of buildings is entitled to
   * know which of them exist.
   */
  disclosure: {
    ar: "هذه أعمال إظهار ثلاثي الأبعاد ينتجها المكتب لتوضيح التصميم. لم تُرفق بها أسماء عملاء أو مشاريع أو مواقع، ولن يُنشر أيٌّ منها دون مستند يثبته.",
    en: "These are 3D visualisations the office produces to communicate a design. No client, project name or location is attached to them, and none will be published without a document behind it.", es: "Se trata de visualizaciones 3D que la oficina produce para comunicar un diseño. No llevan asociado ningún cliente, nombre de proyecto ni ubicación, y ninguno se publicará sin un documento que lo respalde.", pt: "São visualizações 3D que o gabinete produz para comunicar um projeto. Não lhes está associado qualquer cliente, nome de obra ou localização, e nenhum será publicado sem um documento que o suporte.", fr: "Il s'agit de visualisations 3D que le bureau produit pour communiquer un projet. Aucun client, nom d'opération ni localisation ne leur est attaché, et aucun ne sera publié sans document à l'appui.",
  } as Bi,
  newsTitle: { ar: "الأخبار والإعلانات", en: "News and announcements", es: "Noticias y anuncios", pt: "Notícias e anúncios", fr: "Actualités et annonces" } as Bi,
  read: { ar: "اقرأ المزيد", en: "Read more", es: "Leer más", pt: "Ler mais", fr: "Lire la suite" } as Bi,
  /** Shown until the first post is published. Says so plainly. */
  emptyTitle: { ar: "لا توجد أخبار منشورة بعد", en: "No published items yet", es: "Aún no hay publicaciones", pt: "Ainda não há publicações", fr: "Aucune publication pour le moment" } as Bi,
  emptyBody: {
    ar: "سيظهر هنا كل ما يُنشر من أخبار وإعلانات ومقالات.",
    en: "News, announcements and articles will appear here as they are published.", es: "Aquí aparecerán las noticias, los anuncios y los artículos a medida que se publiquen.", pt: "Aqui aparecerão as notícias, os anúncios e os artigos à medida que forem publicados.", fr: "Les actualités, annonces et articles apparaîtront ici au fur et à mesure de leur publication.",
  } as Bi,
};

/**
 * The media centre: the visual portfolio first, then the Post model that
 * /blog already writes to — one place a story is authored rather than a
 * parallel model.
 *
 * The gallery is plain CSS columns with native lazy loading and no client
 * JavaScript at all. A lightbox would need a client component for twenty-three
 * images that are already the right size; `loading="lazy"` plus intrinsic
 * dimensions does the work, and the page stays a server component.
 */
export default async function MediaPage() {
  const locale = await getLocale();
  const posts = await prisma.post
    .findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      take: 24,
      select: { id: true, slug: true, title: true, excerpt: true, coverImage: true, createdAt: true },
    })
    .catch(() => []);

  const df = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : locale, { dateStyle: "long" });

  return (
    <>
      <section className="border-b border-[color:var(--accent)]/20 bg-[#0c3433] text-white">
        <div className="mx-auto max-w-6xl px-5 py-14 text-center">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--accent)]">
            {t(UI.eyebrow, locale)}
          </div>
          <h1 className="mt-4 text-3xl font-bold md:text-4xl">{t(UI.title, locale)}</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/70">{t(UI.lede, locale)}</p>
          <Ornament className="mx-auto mt-6 max-w-xs" />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 className="text-2xl font-extrabold md:text-3xl">{t(UI.galleryTitle, locale)}</h2>
          <span className="text-sm text-[color:var(--ink)]/55">
            {ALL_MEDIA.length} {t(UI.stills, locale)} · {MEDIA_CLIPS.length} {t(UI.clipsLabel, locale)}
          </span>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[color:var(--ink)]/60">
          {t(UI.disclosure, locale)}
        </p>

        {MEDIA_COLLECTIONS.map((c) => (
          <div key={c.slug} id={c.slug} className="mt-14 scroll-mt-24">
            <h3 className="text-lg font-bold">{t(c.title, locale)}</h3>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[color:var(--ink)]/60">{t(c.blurb, locale)}</p>

            {/* Masonry via CSS columns: these frames are a mix of landscape,
                portrait and one long strip, and a fixed-ratio grid would crop
                drawings that the crop is the content of. */}
            <div className="mt-6 columns-1 gap-4 sm:columns-2 lg:columns-3 [&>figure]:mb-4">
              {c.items.map((m) => (
                <figure
                  key={m.id}
                  id={m.id}
                  className="app-reveal break-inside-avoid overflow-hidden rounded-xl border border-[color:var(--hairline)] bg-[color:var(--panel)] scroll-mt-24"
                >
                  <img
                    src={m.src}
                    alt={t(m.alt, locale)}
                    loading="lazy"
                    decoding="async"
                    className="w-full"
                  />
                  <figcaption className="px-4 py-3 text-xs leading-relaxed text-[color:var(--ink)]/60">
                    {t(m.alt, locale)}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        ))}

        <div className="mt-16">
          <h3 className="text-lg font-bold">{t(UI.clipsTitle, locale)}</h3>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {MEDIA_CLIPS.map((clip) => (
              <figure
                key={clip.id}
                className="overflow-hidden rounded-xl border border-[color:var(--hairline)] bg-[color:var(--panel)]"
              >
                {/* preload="none" matters: these are megabytes each, and the
                    poster is already a still from the same set. */}
                <video
                  controls
                  playsInline
                  muted
                  preload="none"
                  poster={clip.poster}
                  className="aspect-video w-full bg-black object-cover"
                >
                  <source src={clip.src} type="video/mp4" />
                  {t(UI.noVideo, locale)}
                </video>
                <figcaption className="px-4 py-3 text-xs font-semibold text-[color:var(--ink)]/70">
                  {t(clip.title, locale)}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[color:var(--hairline)]">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-2xl font-extrabold md:text-3xl">{t(UI.newsTitle, locale)}</h2>

          {posts.length === 0 ? (
            <div className="mx-auto mt-8 max-w-lg rounded-xl border border-[color:var(--hairline)] bg-[color:var(--panel)] p-10 text-center">
              <span className="mx-auto block size-2 rotate-45 bg-[color:var(--accent)]" aria-hidden="true" />
              <h3 className="mt-4 text-lg font-bold">{t(UI.emptyTitle, locale)}</h3>
              <p className="mt-2 text-sm text-[color:var(--ink)]/60">{t(UI.emptyBody, locale)}</p>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => (
                <article
                  key={p.id}
                  className="app-reveal flex flex-col overflow-hidden rounded-xl border border-[color:var(--hairline)] bg-[color:var(--panel)]"
                >
                  {p.coverImage && (
                    <img
                      src={p.coverImage}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      className="aspect-[16/9] w-full object-cover"
                    />
                  )}
                  <div className="flex flex-1 flex-col p-6">
                    <time className="text-xs text-[color:var(--accent-text)]" dateTime={p.createdAt.toISOString()}>
                      {df.format(p.createdAt)}
                    </time>
                    <h3 className="mt-2 text-lg font-bold leading-snug">{p.title}</h3>
                    {p.excerpt && <p className="mt-2 flex-1 text-sm text-[color:var(--ink)]/65">{p.excerpt}</p>}
                    <Link
                      href={`/blog/${p.slug}`}
                      className="mt-4 text-sm font-semibold text-[color:var(--accent-text)] hover:underline"
                    >
                      {t(UI.read, locale)} <span aria-hidden="true">›</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
