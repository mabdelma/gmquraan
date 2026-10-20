import type { Bi } from "./brand-content";

/**
 * The visual portfolio.
 *
 * This is an unskinned template, so the imagery is generated placeholder tiles
 * and every caption describes a placeholder rather than real work. No client,
 * project, location, value or date is named anywhere below.
 *
 * `kind` separates what a studio drew (`visualisation`) from anything
 * photographed on site (`photograph`). Keep that distinction when you replace
 * these with real images: publishing someone else's finished facility as your
 * own portfolio piece is the one mistake here that is expensive to undo.
 */

export type MediaKind = "visualisation" | "photograph" | "video";

export type MediaItem = {
  /** Stable id — also the anchor, so a single image can be linked to. */
  id: string;
  kind: MediaKind;
  /** Public path of the still, or of the video file for `kind: "video"`. */
  src: string;
  /**
   * Descriptive alt text. These images carry real information about the work,
   * so they are content rather than decoration and get a real description.
   */
  alt: Bi;
};

export type MediaCollection = {
  slug: string;
  title: Bi;
  /** What the set shows. Describes the frames, never the commission. */
  blurb: Bi;
  items: MediaItem[];
};

const v = (n: string, alt: Bi): MediaItem => ({
  id: `project-${n}`,
  kind: "visualisation",
  src: `/img/projects/project-${n}.png`,
  alt,
});

export const MEDIA_COLLECTIONS: MediaCollection[] = [
  {
    slug: "filling-station",
    title: {
      ar: "محطة شحن ومحطة خدمة",
      en: "Charging and service station", es: "Estación de carga y servicio", pt: "Estação de carregamento e serviço", fr: "Station de recharge et de service",
    },
    blurb: {
      ar: "مجموعة إظهار لمحطة شحن سيارات كهربائية: الساحة والمظلات ومبنى الخدمة ومقهى الواجهة، في لقطات أرضية وجوية.",
      en: "A visualisation set for an electric-vehicle charging station: the forecourt, the canopies, the service building and its frontage café, in eye-level and aerial views.", es: "Un conjunto de visualizaciones de una estación de carga de vehículos eléctricos: la explanada, las marquesinas, el edificio de servicio y su cafetería, a nivel de calle y en vistas aéreas.", pt: "Um conjunto de visualizações de uma estação de carregamento de veículos elétricos: a praça, as coberturas, o edifício de serviço e o café da frente, ao nível do olhar e em vistas aéreas.", fr: "Un ensemble de visualisations pour une station de recharge de véhicules électriques : l'aire de service, les auvents, le bâtiment technique et son café en façade, en vues à hauteur d'œil et aériennes.",
    },
    items: [
      v("01", {
        ar: "منظور جوي لمحطة شحن: مبنى الخدمة وساحة مظلّلة بمظلات نسيجية.",
        en: "Aerial view of a charging station: the service building and a forecourt shaded by fabric canopies.", es: "Vista aérea de una estación de carga: el edificio de servicio y una explanada sombreada por marquesinas textiles.", pt: "Vista aérea de uma estação de carregamento: o edifício de serviço e uma praça sombreada por coberturas têxteis.", fr: "Vue aérienne d'une station de recharge : le bâtiment technique et une aire ombragée par des auvents en toile.",
      }),
      v("06", {
        ar: "واجهة مبنى الخدمة من الطريق، ببرج اللافتة ومصاطب المقهى.",
        en: "The service building seen from the road, with its signage tower and stepped café terrace.", es: "El edificio de servicio visto desde la carretera, con su torre de señalización y la terraza escalonada de la cafetería.", pt: "O edifício de serviço visto da estrada, com a torre de sinalética e o terraço escalonado do café.", fr: "Le bâtiment technique vu depuis la route, avec sa tour d'enseigne et la terrasse en gradins du café.",
      }),
      v("07", {
        ar: "لقطة جوية قريبة من برج اللافتة وخلفه الساحة والمظلات.",
        en: "A close aerial on the signage tower, with the forecourt and canopies behind it.", es: "Una toma aérea cercana de la torre de señalización, con la explanada y las marquesinas al fondo.", pt: "Um plano aéreo próximo da torre de sinalética, com a praça e as coberturas atrás.", fr: "Un plan aérien rapproché sur la tour d'enseigne, avec l'aire et les auvents en arrière-plan.",
      }),
      v("03", {
        ar: "مدخل المحطة من زاوية الطريق، بعمود الأسعار ومصاطب المقهى.",
        en: "The station approach from the road, with the price totem and the café steps.", es: "El acceso a la estación desde la carretera, con el tótem de precios y las escaleras de la cafetería.", pt: "A aproximação à estação desde a estrada, com o totem de preços e os degraus do café.", fr: "L'approche de la station depuis la route, avec le totem de prix et les marches du café.",
      }),
      v("02", {
        ar: "تراس المقهى الخارجي أمام الواجهة الزجاجية لمبنى الخدمة.",
        en: "The outdoor café terrace in front of the service building's glazed frontage.", es: "La terraza exterior de la cafetería frente al frente acristalado del edificio de servicio.", pt: "O terraço exterior do café em frente à fachada envidraçada do edifício de serviço.", fr: "La terrasse extérieure du café devant la façade vitrée du bâtiment technique.",
      }),
      v("04", {
        ar: "خلايا الشحن تحت مظلات نسيجية، بأعمدة شحن وحواجز حماية.",
        en: "Charging bays under fabric canopies, with charge posts and protective hoops.", es: "Plazas de carga bajo marquesinas textiles, con postes de carga y arcos de protección.", pt: "Lugares de carregamento sob coberturas têxteis, com postes de carga e arcos de proteção.", fr: "Places de recharge sous auvents en toile, avec bornes et arceaux de protection.",
      }),
      v("05", {
        ar: "منظور الساحة من مستوى النظر، يُظهر دورة الحركة بين خلايا الشحن والمبنى.",
        en: "The forecourt at eye level, showing how traffic circulates between the charging bays and the building.", es: "La explanada a nivel de la vista, mostrando cómo circula el tráfico entre las plazas de carga y el edificio.", pt: "A praça ao nível do olhar, mostrando como o trânsito circula entre os lugares de carga e o edifício.", fr: "L'aire de service à hauteur d'œil, montrant la circulation entre les places de recharge et le bâtiment.",
      }),
    ],
  },
  {
    slug: "rapid-build",
    title: {
      ar: "مبانٍ سريعة الإنشاء",
      en: "Rapid-build community buildings", es: "Edificios comunitarios de construcción rápida", pt: "Edifícios comunitários de construção rápida", fr: "Bâtiments communautaires à construction rapide",
    },
    blurb: {
      ar: "مجمّع أحادي الطابق بهيكل معدني وكسوة مضلّعة، حول فناء مظلّل، في سياق سكني كثيف — بلقطات نهارية وعند الغروب.",
      en: "A single-storey compound in steel frame and profiled cladding, arranged around a shaded courtyard in a dense residential setting — in daylight and at dusk.", es: "Un conjunto de una planta con estructura metálica y revestimiento perfilado, organizado en torno a un patio sombreado en un entorno residencial denso, de día y al atardecer.", pt: "Um conjunto de um piso em estrutura metálica e revestimento perfilado, organizado em torno de um pátio sombreado num contexto residencial denso — de dia e ao anoitecer.", fr: "Un ensemble de plain-pied en ossature acier et bardage nervuré, organisé autour d'une cour ombragée dans un contexte résidentiel dense — de jour et au crépuscule.",
    },
    items: [
      v("09", {
        ar: "منظور جوي للمجمّع وحده في أرض مفتوحة عند الغروب.",
        en: "An aerial of the compound standing alone on open ground at sunset.", es: "Una vista aérea del conjunto aislado en terreno abierto al atardecer.", pt: "Uma vista aérea do conjunto isolado em terreno aberto ao pôr do sol.", fr: "Une vue aérienne de l'ensemble isolé sur un terrain dégagé au coucher du soleil.",
      }),
      v("10", {
        ar: "المجمّع في سياقه: سور محيط، وفناء مظلّل بالتظليل الشمسي، ومبانٍ مجاورة.",
        en: "The compound in context: a perimeter wall, a courtyard under solar shading, and neighbouring buildings.", es: "El conjunto en su contexto: muro perimetral, patio bajo protección solar y edificaciones vecinas.", pt: "O conjunto no seu contexto: muro perimetral, pátio sob sombreamento solar e edifícios vizinhos.", fr: "L'ensemble dans son contexte : mur de clôture, cour sous protection solaire et bâtiments voisins.",
      }),
      v("11", {
        ar: "المجمّع نفسه عند الغروب، بالإضاءة الداخلية والخارجية مشتغلة.",
        en: "The same compound at sunset, with the interior and external lighting on.", es: "El mismo conjunto al atardecer, con la iluminación interior y exterior encendida.", pt: "O mesmo conjunto ao pôr do sol, com a iluminação interior e exterior acesa.", fr: "Le même ensemble au coucher du soleil, éclairages intérieur et extérieur allumés.",
      }),
      v("12", {
        ar: "نسخة نهارية بكسوة فاتحة ومظلة نباتية فوق الفناء.",
        en: "A daylight variant in pale cladding, with a planted pergola over the courtyard.", es: "Una variante diurna con revestimiento claro y una pérgola vegetal sobre el patio.", pt: "Uma variante diurna com revestimento claro e uma pérgola vegetal sobre o pátio.", fr: "Une variante de jour en bardage clair, avec une pergola végétalisée au-dessus de la cour.",
      }),
      v("13", {
        ar: "المجمّع عند الغروب والفناء مستخدَم، تُرى من خلال الزجاج القاعات الداخلية.",
        en: "The compound at dusk with the courtyard in use, the internal rooms visible through the glazing.", es: "El conjunto al anochecer con el patio en uso y las salas interiores visibles a través del acristalamiento.", pt: "O conjunto ao anoitecer com o pátio em uso e as salas interiores visíveis através dos envidraçados.", fr: "L'ensemble au crépuscule, cour occupée, les salles intérieures visibles à travers les vitrages.",
      }),
    ],
  },
  {
    slug: "agricultural-compound",
    title: {
      ar: "مجمّع زراعي وإنتاج حيواني",
      en: "Agricultural and livestock compound", es: "Complejo agrícola y ganadero", pt: "Complexo agrícola e pecuário", fr: "Complexe agricole et d'élevage",
    },
    blurb: {
      ar: "مخطّط موقع عام لمجمّع صحراوي مسوّر: ثلاث عنابر، ومصفوفة ألواح شمسية، وأحواض معالجة، وطرق خدمة — في مساقط جوية ولقطة رأسية.",
      en: "A site layout for a walled desert compound: three sheds, a solar array, treatment basins and service roads — in aerial views and one top-down plan shot.", es: "Una implantación para un complejo desértico vallado: tres naves, una planta solar, balsas de tratamiento y viales de servicio, en vistas aéreas y una toma cenital.", pt: "Uma implantação de um complexo desértico murado: três pavilhões, um campo solar, bacias de tratamento e vias de serviço — em vistas aéreas e um plano a pique.", fr: "Un plan masse pour un complexe désertique clos : trois halls, un champ solaire, des bassins de traitement et des voies de service — en vues aériennes et une prise de vue à la verticale.",
    },
    items: [
      v("16", {
        ar: "لقطة رأسية مباشرة تقرأ المخطّط العام: العنابر، والألواح الشمسية، وحلقات الطرق.",
        en: "A straight top-down shot that reads as the site plan: the sheds, the solar array and the loop roads.", es: "Una toma cenital directa que se lee como el plano de implantación: las naves, la planta solar y los viales en anillo.", pt: "Um plano a pique que se lê como a planta de implantação: os pavilhões, o campo solar e as vias em anel.", fr: "Une prise de vue à la verticale qui se lit comme le plan masse : les halls, le champ solaire et les voies en boucle.",
      }),
      v("14", {
        ar: "منظور جوي مائل للمجمّع في نخيل صحراوي عند الغروب.",
        en: "An oblique aerial of the compound among desert palms at sunset.", es: "Una aérea oblicua del complejo entre palmeras del desierto al atardecer.", pt: "Uma aérea oblíqua do complexo entre palmeiras do deserto ao pôr do sol.", fr: "Une aérienne oblique du complexe parmi les palmiers du désert au coucher du soleil.",
      }),
      v("15", {
        ar: "المجمّع من الجهة المقابلة، وتظهر مصفوفة الألواح الشمسية بطول السور.",
        en: "The compound from the opposite side, the solar array running along the perimeter wall.", es: "El complejo desde el lado opuesto, con la planta solar recorriendo el muro perimetral.", pt: "O complexo do lado oposto, com o campo solar a acompanhar o muro perimetral.", fr: "Le complexe depuis le côté opposé, le champ solaire longeant le mur de clôture.",
      }),
      v("17", {
        ar: "منظور منخفض يُظهر أحواض المعالجة وخزان المياه ومسارات الخدمة.",
        en: "A lower view showing the treatment basins, the water tank and the service routes.", es: "Una vista más baja que muestra las balsas de tratamiento, el depósito de agua y los recorridos de servicio.", pt: "Uma vista mais baixa que mostra as bacias de tratamento, o depósito de água e os percursos de serviço.", fr: "Une vue plus basse montrant les bassins de traitement, la cuve d'eau et les voies de service.",
      }),
    ],
  },
  {
    slug: "hospitality-interiors",
    title: {
      ar: "تصميم داخلي للضيافة",
      en: "Hospitality interiors", es: "Interiorismo de hostelería", pt: "Interiores de hotelaria", fr: "Intérieurs d'hôtellerie-restauration",
    },
    blurb: {
      ar: "مقاهٍ ومطاعم: مناطق جلوس، وكاونترات عرض، وإضاءة، ومشجّرات داخلية — إظهار يُستخدم في اعتماد التشطيبات قبل التنفيذ.",
      en: "Cafés and restaurants: seating zones, display counters, lighting and internal planting — the visualisation a client signs a finishes schedule off against.", es: "Cafeterías y restaurantes: zonas de asientos, mostradores expositores, iluminación y vegetación interior; la visualización con la que un cliente aprueba la memoria de acabados.", pt: "Cafés e restaurantes: zonas de estar, balcões de exposição, iluminação e plantação interior — a visualização com que um cliente aprova o mapa de acabamentos.", fr: "Cafés et restaurants : zones d'assise, comptoirs de présentation, éclairage et plantations intérieures — la visualisation sur laquelle un client valide un cahier des finitions.",
    },
    items: [
      v("18", {
        ar: "صالة مقهى حول شجرة داخلية، بكاونتر حجري وإضاءة معلّقة.",
        en: "A café floor arranged around an internal tree, with a stone counter and pendant lighting.", es: "Una sala de cafetería organizada en torno a un árbol interior, con mostrador de piedra e iluminación colgante.", pt: "Uma sala de café organizada em torno de uma árvore interior, com balcão de pedra e iluminação suspensa.", fr: "Une salle de café organisée autour d'un arbre intérieur, avec comptoir en pierre et suspensions.",
      }),
      v("20", {
        ar: "منظور آخر للصالة نفسها، تظهر فيه فاترينة المخبوزات وجدار القائمة.",
        en: "Another view of the same floor, showing the bakery display and the menu wall.", es: "Otra vista de la misma sala, con el expositor de panadería y el panel de carta.", pt: "Outra vista da mesma sala, com a vitrina de padaria e o painel de menu.", fr: "Une autre vue de la même salle, avec la vitrine de boulangerie et le mur de carte.",
      }),
      v("21", {
        ar: "منطقة جلوس بمقعد منجّد منحنٍ وشبابيك مطلّة على مناظر مفتوحة.",
        en: "A seating area with a curved upholstered banquette and windows onto open country.", es: "Una zona de asientos con banco tapizado curvo y ventanas hacia campo abierto.", pt: "Uma zona de estar com banco estofado curvo e janelas sobre campo aberto.", fr: "Un espace d'assise avec banquette capitonnée courbe et fenêtres sur la campagne.",
      }),
      v("19", {
        ar: "رفع داخلي مستوٍ لكاونتر الخدمة: الرفوف، ولوحة القائمة، ومقاعد البار.",
        en: "A flat internal elevation of the service counter: shelving, menu board and bar stools.", es: "Un alzado interior plano del mostrador de servicio: estanterías, pizarra de carta y taburetes.", pt: "Um alçado interior plano do balcão de serviço: prateleiras, quadro de menu e bancos de bar.", fr: "Une élévation intérieure à plat du comptoir de service : étagères, tableau de carte et tabourets.",
      }),
    ],
  },
  {
    slug: "residential-and-office",
    title: {
      ar: "فيلات ومكاتب",
      en: "Villas and offices", es: "Villas y oficinas", pt: "Moradias e escritórios", fr: "Villas et bureaux",
    },
    blurb: {
      ar: "واجهات سكنية بكسوة حجرية وإضاءة مخفية، ومكتب إداري — المقياس الذي تبدأ به أغلب مشاريع التصميم.",
      en: "Residential elevations in stone cladding with concealed lighting, and an executive office — the scale most design commissions start at.", es: "Alzados residenciales con revestimiento de piedra e iluminación oculta, y un despacho de dirección: la escala en la que empieza la mayoría de los encargos.", pt: "Alçados residenciais com revestimento em pedra e iluminação oculta, e um gabinete de direção — a escala em que começa a maioria das encomendas.", fr: "Des façades résidentielles en parement de pierre avec éclairage encastré, et un bureau de direction — l'échelle à laquelle commencent la plupart des commandes.",
    },
    items: [
      v("24", {
        ar: "الواجهة الأمامية لفيلا عند الغروب، بكتل حجرية وإضاءة محيطية مخفية.",
        en: "The front elevation of a villa at dusk, in stone masses with concealed perimeter lighting.", es: "El alzado frontal de una villa al anochecer, en volúmenes de piedra con iluminación perimetral oculta.", pt: "O alçado frontal de uma moradia ao anoitecer, em volumes de pedra com iluminação perimetral oculta.", fr: "La façade avant d'une villa au crépuscule, en volumes de pierre avec éclairage périmétrique encastré.",
      }),
      v("23", {
        ar: "الفيلا نفسها بزاوية ثلاثة أرباع، يظهر فيها المدخل والتنسيق الخارجي.",
        en: "The same villa in three-quarter view, showing the entrance and the landscaping.", es: "La misma villa en vista a tres cuartos, con la entrada y la jardinería.", pt: "A mesma moradia em vista de três quartos, com a entrada e o arranjo exterior.", fr: "La même villa en vue trois quarts, montrant l'entrée et les aménagements paysagers.",
      }),
      v("22", {
        ar: "مكتب إداري: مكتب خشبي، وكسوة حائط خلفية، وإضاءة مخفية بالسقف.",
        en: "An executive office: a timber desk, a panelled feature wall and concealed ceiling lighting.", es: "Un despacho de dirección: mesa de madera, pared revestida de paneles e iluminación de techo oculta.", pt: "Um gabinete de direção: secretária de madeira, parede em painéis e iluminação de teto oculta.", fr: "Un bureau de direction : plan de travail en bois, mur en panneaux et éclairage de plafond encastré.",
      }),
    ],
  },
];

/**
 * The two supplied clips. They are muted, loop-free and carry `preload none`
 * at the call site: four megabytes of video should not download because
 * somebody opened the media centre on a phone.
 *
 * `poster` is a still from the same set rather than a generated thumbnail, so
 * the card has something to show before the first frame arrives.
 */
export const MEDIA_CLIPS: { id: string; src: string; poster: string; title: Bi }[] = [
  {
    id: "clip-01",
    src: "/video/clip-01.mp4",
    poster: "/img/projects/project-01.png",
    title: {
      ar: "جولة متحركة — محطة الشحن",
      en: "Walkthrough — charging station", es: "Recorrido — estación de carga", pt: "Percurso — estação de carregamento", fr: "Visite animée — station de recharge",
    },
  },
  {
    id: "clip-02",
    src: "/video/clip-02.mp4",
    poster: "/img/projects/project-13.png",
    title: {
      ar: "جولة متحركة — مجمّع سريع الإنشاء",
      en: "Walkthrough — rapid-build compound", es: "Recorrido — conjunto de construcción rápida", pt: "Percurso — conjunto de construção rápida", fr: "Visite animée — ensemble à construction rapide",
    },
  },
];

/** Every published still, flattened — used for counts and for the lightbox. */
export const ALL_MEDIA: MediaItem[] = MEDIA_COLLECTIONS.flatMap((c) => c.items);
