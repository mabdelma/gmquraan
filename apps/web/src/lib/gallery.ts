import type { Bi } from "./brand-content";

/**
 * The association's visual material.
 *
 * Every image here was recovered from the association's own site at gmquran.com
 * — it is the imagery the association actually chose to represent itself, not a
 * placeholder. It is, honestly, graphic material rather than documentary
 * photography: a set of flat-illustration cards introducing the association's
 * identity and values, the Qur'anic card from its homepage, a community
 * illustration, and the banner it used on its About page. No photograph of the
 * association's circles, nursery or workshop exists in what it published, so
 * none is shown or implied here — the captions describe each image as the
 * graphic it is, and name no person, place or date.
 *
 * `kind` is "graphic" for these; the type keeps "photograph" and "video" for
 * the day the association supplies real ones, which drop in at the same paths.
 */

export type MediaKind = "graphic" | "photograph" | "video";

export type MediaItem = {
  /** Stable id — also the anchor, so a single image can be linked to. */
  id: string;
  kind: MediaKind;
  /** Public path of the still, or of the video file for `kind: "video"`. */
  src: string;
  /** Descriptive alt text, in every served and content locale. */
  alt: Bi;
};

export type MediaCollection = {
  slug: string;
  title: Bi;
  /** What the set shows. */
  blurb: Bi;
  items: MediaItem[];
};

/** A concept card from the association's set, by file stem and its own label. */
const card = (n: string, labelAr: string, concept: Bi): MediaItem => ({
  id: `card-${n}`,
  kind: "graphic",
  src: `/img/assoc/community-${n}.jpg`,
  alt: {
    ar: `بطاقة تعريفية من الجمعية بعنوان «${labelAr}» — رسم مسطّح على خلفية خضراء.`,
    en: `An association card titled "${concept.en}" — a flat illustration on a green ground.`,
    es: `Una tarjeta de la asociación titulada «${concept.es}» — una ilustración plana sobre fondo verde.`,
    pt: `Um cartão da associação intitulado "${concept.pt}" — uma ilustração plana sobre fundo verde.`,
    fr: `Une carte de l'association intitulée « ${concept.fr} » — une illustration plate sur fond vert.`,
  },
});

export const MEDIA_COLLECTIONS: MediaCollection[] = [
  {
    slug: "identity",
    title: {
      ar: "من هوية الجمعية",
      en: "The association's imagery", es: "Imágenes de la asociación", pt: "Imagens da associação", fr: "L'imagerie de l'association",
    },
    blurb: {
      ar: "الصور التي اختارتها الجمعية لتعرّف بنفسها على موقعها: بطاقة قرآنية، ورسم مجتمعي، ولوحة الواجهة.",
      en: "The images the association chose to present itself on its site: a Qur'anic card, a community illustration, and its page banner.", es: "Las imágenes que la asociación eligió para presentarse en su sitio: una tarjeta coránica, una ilustración comunitaria y el banner de su página.", pt: "As imagens que a associação escolheu para se apresentar no seu site: um cartão corânico, uma ilustração comunitária e o banner da sua página.", fr: "Les images que l'association a choisies pour se présenter sur son site : une carte coranique, une illustration communautaire et la bannière de sa page.",
    },
    items: [
      {
        id: "quran-card",
        kind: "graphic",
        src: "/img/assoc/quran-card.jpg",
        alt: {
          ar: "بطاقة لمصحف مفتوح وسبحة، تحمل عبارة «اقبل على القرآن تقبل الحياة عليك».",
          en: "A card showing an open Qur'an and prayer beads, carrying the words “Turn to the Qur'an, and life turns to you”.", es: "Una tarjeta con un Corán abierto y un rosario, con la frase “Acércate al Corán y la vida se acercará a ti”.", pt: "Um cartão com um Alcorão aberto e um tasbih, com a frase “Volta-te para o Alcorão e a vida volta-se para ti”.", fr: "Une carte montrant un Coran ouvert et un chapelet, portant la phrase « Tourne-toi vers le Coran, et la vie se tournera vers toi ».",
        },
      },
      {
        id: "community-montage",
        kind: "graphic",
        src: "/img/assoc/community-montage.jpg",
        alt: {
          ar: "رسم مجتمعي تتوسّطه أمّ وطفلها، وحوله رعاية صحية ولقاءات وأبنية المجتمع المحلي.",
          en: "A community illustration centred on a mother and child, surrounded by healthcare, meetings and the buildings of a local community.", es: "Una ilustración comunitaria centrada en una madre y su hijo, rodeada de atención sanitaria, reuniones y los edificios de una comunidad local.", pt: "Uma ilustração comunitária centrada numa mãe e no seu filho, rodeada de cuidados de saúde, reuniões e os edifícios de uma comunidade local.", fr: "Une illustration communautaire centrée sur une mère et son enfant, entourée de soins, de réunions et des bâtiments d'une communauté locale.",
        },
      },
      {
        id: "banner",
        kind: "graphic",
        src: "/img/assoc/banner.jpg",
        alt: {
          ar: "لوحة لعائلة — جدّ وأب وأمّ وطفلان — محمولة على كفّ يد، رمزًا للرعاية.",
          en: "A banner of a family — a grandfather, parents and two children — cradled in an open hand, as a sign of care.", es: "Un banner de una familia — un abuelo, los padres y dos niños — sostenida en una mano abierta, como signo de cuidado.", pt: "Um banner de uma família — um avô, os pais e duas crianças — amparada numa mão aberta, como sinal de cuidado.", fr: "Une bannière représentant une famille — un grand-père, les parents et deux enfants — tenue dans une main ouverte, en signe de soin.",
        },
      },
    ],
  },
  {
    slug: "value-cards",
    title: {
      ar: "بطاقات القيم والأهداف",
      en: "Values and objectives cards", es: "Tarjetas de valores y objetivos", pt: "Cartões de valores e objetivos", fr: "Cartes des valeurs et objectifs",
    },
    blurb: {
      ar: "مجموعة البطاقات المسطّحة التي تستخدمها الجمعية لتقديم رؤيتها وأهدافها وقيمها.",
      en: "The set of flat-illustration cards the association uses to present its vision, objectives and values.", es: "El conjunto de tarjetas ilustradas que la asociación usa para presentar su visión, objetivos y valores.", pt: "O conjunto de cartões ilustrados que a associação usa para apresentar a sua visão, objetivos e valores.", fr: "L'ensemble de cartes illustrées que l'association utilise pour présenter sa vision, ses objectifs et ses valeurs.",
    },
    items: [
      card("1", "تصور", { ar: "تصور", en: "Vision", es: "Visión", pt: "Visão", fr: "Vision" }),
      card("3", "الأهداف", { ar: "الأهداف", en: "Objectives", es: "Objetivos", pt: "Objetivos", fr: "Objectifs" }),
      card("4", "النشأة", { ar: "النشأة", en: "Founding", es: "Origen", pt: "Origem", fr: "Fondation" }),
      card("5", "مسيرة", { ar: "مسيرة", en: "Journey", es: "Trayectoria", pt: "Percurso", fr: "Parcours" }),
      card("2", "نصائح", { ar: "نصائح", en: "Guidance", es: "Consejos", pt: "Orientação", fr: "Conseils" }),
      card("6", "التوجّهات", { ar: "التوجّهات", en: "Directions", es: "Orientaciones", pt: "Orientações", fr: "Orientations" }),
      card("7", "العلاقات", { ar: "العلاقات", en: "Relationships", es: "Relaciones", pt: "Relações", fr: "Relations" }),
      card("8", "الأفكار", { ar: "الأفكار", en: "Ideas", es: "Ideas", pt: "Ideias", fr: "Idées" }),
      card("9", "المرونة", { ar: "المرونة", en: "Resilience", es: "Resiliencia", pt: "Resiliência", fr: "Résilience" }),
    ],
  },
];

/**
 * No video. The association published none, so there are no animated
 * walkthroughs to show — the /media page hides the clips section when this is
 * empty rather than inventing a reel.
 */
export const MEDIA_CLIPS: { id: string; src: string; poster: string; title: Bi }[] = [];

export const ALL_MEDIA: MediaItem[] = MEDIA_COLLECTIONS.flatMap((c) => c.items);
