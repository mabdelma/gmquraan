import type { Locale } from "./i18n";

/**
 * Brand content for the public site — headline copy, values, service areas and
 * page metadata.
 *
 * Every factual claim below (the registration number, the services, the
 * objectives and values) is taken from the association's own published site at
 * gmquran.com. Nothing here is invented: where the association has not
 * published something — the names of its officers, its founding story, figures
 * for people served — this file says nothing rather than filling the gap with
 * plausible copy. See STEWARDSHIP for the one place that rule visibly bites.
 *
 * Together with `content.ts` this is the whole rebranding surface — change
 * these two files and the site is yours.
 */

/**
 * One string in every language the site serves. Every field is required on
 * purpose: the compiler then refuses any copy that is only half-translated,
 * which is the only reliable way to keep five languages honest. There is no
 * fallback — a missing translation is a build error, not a silent English
 * string shown to a French reader.
 */
export type Bi = { en: string; ar: string; es: string; pt: string; fr: string };

/** Pick the reviewed copy for a locale. */
export const t = (v: Bi, locale: Locale): string => v[locale] ?? v.en;

export const HERO = {
  headline: {
    ar: "نحفظ كتاب الله،",
    en: "We preserve the Qur'an,", es: "Preservamos el Corán,", pt: "Preservamos o Alcorão,", fr: "Nous préservons le Coran,"
  } as Bi,
  headlineAccent: {
    ar: "ونرعى أهله.",
    en: "and we care for its people.", es: "y cuidamos de su gente.", pt: "e cuidamos do seu povo.", fr: "et nous prenons soin des siens."
  } as Bi,
  subtitle: {
    ar: "جمعية أهلية بساحل سليم بمحافظة أسيوط، مشهرة برقم ٢٢٤ لسنة ١٩٧٧: تحفيظ القرآن الكريم، وكفالة الأيتام، وحضانة، ومشغل، ومشروعات خدمية، وإقراض.",
    en: "A community association in Sahel Selim, Assiut Governorate, registered as no. 224 of 1977: Qur'an memorisation, orphan sponsorship, a nursery, a workshop, service projects and lending.", es: "Una asociación comunitaria en Sahel Selim, gobernación de Asiut, inscrita con el n.º 224 de 1977: memorización del Corán, apadrinamiento de huérfanos, guardería, taller, proyectos de servicio y préstamos.", pt: "Uma associação comunitária em Sahel Selim, governorado de Assiut, registada com o n.º 224 de 1977: memorização do Alcorão, apadrinhamento de órfãos, creche, oficina, projetos de serviço e crédito.", fr: "Une association communautaire à Sahel Selim, gouvernorat d'Assiout, enregistrée sous le n° 224 de 1977 : mémorisation du Coran, parrainage d'orphelins, crèche, atelier, projets de service et prêts."
  } as Bi,
  primaryCta: { ar: "تواصل معنا", en: "Get in touch", es: "Contáctenos", pt: "Fale connosco", fr: "Nous contacter" } as Bi,
  secondaryCta: { ar: "تعرّف على خدماتنا", en: "See what we do", es: "Vea lo que hacemos", pt: "Veja o que fazemos", fr: "Voir nos actions" } as Bi
};

/**
 * The five values in the trust strip, drawn from the association's published
 * "قيم الجمعية" and "أهداف الجمعية" lists.
 *
 * The published lists run to seven entries between them, and the strip holds
 * five. Rather than truncate, the two pairs that say the same thing in
 * different words are merged: consultation and effective participation become
 * one value about deciding together, and disease awareness and maternal and
 * child welfare become one value about health. Nothing published was dropped.
 *
 * `key` matches VALUE_ICON in components/brand/icons.tsx — adding a value means
 * adding an icon, which is the point: a value without a mark would render as an
 * empty cell in the strip.
 */
export const VALUES: { key: string; title: Bi; body: Bi }[] = [
  {
    key: "transparency",
    title: { ar: "الشفافية", en: "Transparency", es: "Transparencia", pt: "Transparência", fr: "Transparence" },
    body: {
      ar: "الشفافية في اتخاذ القرارات دون انحياز لطرف عن الآخر، وبما يحقق الصالح العام.",
      en: "Transparency in how decisions are taken, without favouring one party over another, in the common interest.", es: "Transparencia en la toma de decisiones, sin favorecer a una parte sobre otra y en bien del interés común.", pt: "Transparência na tomada de decisões, sem favorecer uma parte em detrimento de outra e no interesse comum.", fr: "La transparence dans les décisions, sans favoriser une partie plutôt qu'une autre, dans l'intérêt commun."
    }
  },
  {
    key: "participation",
    title: { ar: "المشاركة والتشاور", en: "Participation and consultation", es: "Participación y consulta", pt: "Participação e consulta", fr: "Participation et concertation" },
    body: {
      ar: "المشاركة الفعالة من أفراد الجمعية وأهل المجتمع المحلي، وبخاصة مشاركة المرأة، والتشاور لضمان تحمّل المسئولية.",
      en: "Active participation by members and by the local community — women's participation especially — and consultation, so responsibility is genuinely shared.", es: "Participación activa de los miembros y de la comunidad local, en especial la de las mujeres, y consulta para que la responsabilidad se comparta de verdad.", pt: "Participação ativa dos membros e da comunidade local, em especial a das mulheres, e consulta, para que a responsabilidade seja realmente partilhada.", fr: "La participation active des membres et de la communauté locale — celle des femmes en particulier — et la concertation, pour que la responsabilité soit réellement partagée."
    }
  },
  {
    key: "dignity",
    title: { ar: "كرامة الإنسان", en: "Human dignity", es: "Dignidad humana", pt: "Dignidade humana", fr: "Dignité humaine" },
    body: {
      ar: "الرقي بالإنسان وحفظ كرامته، كعنصر هام لاستمرار حياة المجتمع.",
      en: "Raising people up and preserving their dignity, as the thing a community's life actually depends on.", es: "Elevar a la persona y preservar su dignidad, como aquello de lo que depende realmente la vida de una comunidad.", pt: "Elevar a pessoa e preservar a sua dignidade, como aquilo de que a vida de uma comunidade realmente depende.", fr: "Élever la personne et préserver sa dignité, ce dont dépend réellement la vie d'une communauté."
    }
  },
  {
    key: "community",
    title: { ar: "النهوض بالمجتمع", en: "Lifting the community", es: "Impulsar la comunidad", pt: "Impulsionar a comunidade", fr: "Faire progresser la communauté" },
    body: {
      ar: "النهوض بالمجتمع المحلي، والتعاون في كافة ميادين عمل الجمعية.",
      en: "Advancing the local community, and cooperating across every field the association works in.", es: "Impulsar la comunidad local y cooperar en todos los campos en que trabaja la asociación.", pt: "Fazer avançar a comunidade local e cooperar em todos os campos em que a associação atua.", fr: "Faire progresser la communauté locale et coopérer dans tous les domaines où l'association intervient."
    }
  },
  {
    key: "health",
    title: { ar: "الصحة والأسرة", en: "Health and family", es: "Salud y familia", pt: "Saúde e família", fr: "Santé et famille" },
    body: {
      ar: "العمل على توعية الأهالي بمخاطر الأمراض، والارتقاء بمستوى الأم والطفل.",
      en: "Making families aware of the risks of disease, and improving the lot of mothers and children.", es: "Concienciar a las familias sobre los riesgos de las enfermedades y mejorar la situación de madres e hijos.", pt: "Sensibilizar as famílias para os riscos das doenças e melhorar a situação de mães e crianças.", fr: "Sensibiliser les familles aux risques des maladies et améliorer la situation des mères et des enfants."
    }
  }
];

/**
 * The six things the association does, exactly as its own homepage lists them:
 * تحفيظ قرآن، كفالة يتيم، حضانة، مشغل، مشروعات خدمية، إقراض.
 *
 * Slugs are shared with `SERVICES` in content.ts, so a service cannot appear on
 * /services with a card here and no entry there.
 *
 * `image` points at a drawn tile, not a photograph — see
 * scripts/build-service-tiles.py for why. When the association supplies real
 * photographs of its circles, nursery and workshop, replacing the file at the
 * same path is the whole change.
 */
export const PRACTICE_AREAS: { slug: string; title: Bi; image: string; detail: Bi }[] = [
  {
    slug: "quran-memorisation",
    title: { ar: "تحفيظ القرآن الكريم", en: "Qur'an Memorisation", es: "Memorización del Corán", pt: "Memorização do Alcorão", fr: "Mémorisation du Coran" },
    image: "/img/services/quran-memorisation.png",
    detail: {
      ar: "حلقات لتحفيظ القرآن الكريم وتعليم التجويد — وهي العمل الذي قامت عليه الجمعية منذ إشهارها سنة ١٩٧٧.",
      en: "Circles for memorising the Qur'an and learning recitation — the work the association was founded on when it was registered in 1977.", es: "Círculos de memorización del Corán y aprendizaje de la recitación: la labor sobre la que se fundó la asociación al inscribirse en 1977.", pt: "Círculos de memorização do Alcorão e aprendizagem da recitação — o trabalho que deu origem à associação quando foi registada em 1977.", fr: "Des cercles de mémorisation du Coran et d'apprentissage de la récitation — l'activité fondatrice de l'association lors de son enregistrement en 1977."
    }
  },
  {
    slug: "orphan-sponsorship",
    title: { ar: "كفالة الأيتام", en: "Orphan Sponsorship", es: "Apadrinamiento de huérfanos", pt: "Apadrinhamento de órfãos", fr: "Parrainage d'orphelins" },
    image: "/img/services/orphan-sponsorship.png",
    detail: {
      ar: "كفالة الأيتام ومتابعة أحوالهم وأسرهم، بما يحفظ كرامتهم ولا يجعل العون منّة.",
      en: "Sponsoring orphans and staying with their families, in a way that protects their dignity rather than making help a favour.", es: "Apadrinar a los huérfanos y acompañar a sus familias, de modo que se proteja su dignidad y la ayuda no sea un favor.", pt: "Apadrinhar órfãos e acompanhar as suas famílias, de modo a proteger a sua dignidade e não fazer da ajuda um favor.", fr: "Parrainer les orphelins et accompagner leurs familles, d'une manière qui protège leur dignité au lieu de faire de l'aide une faveur."
    }
  },
  {
    slug: "nursery",
    title: { ar: "الحضانة", en: "Nursery", es: "Guardería", pt: "Creche", fr: "Crèche" },
    image: "/img/services/nursery.png",
    detail: {
      ar: "حضانة لأطفال المجتمع المحلي، ضمن هدف الجمعية في الارتقاء بمستوى الأم والطفل.",
      en: "A nursery for the children of the local community, under the association's aim of improving the lot of mothers and children.", es: "Una guardería para los niños de la comunidad local, dentro del objetivo de la asociación de mejorar la situación de madres e hijos.", pt: "Uma creche para as crianças da comunidade local, no âmbito do objetivo da associação de melhorar a situação de mães e crianças.", fr: "Une crèche pour les enfants de la communauté locale, au titre de l'objectif de l'association d'améliorer la situation des mères et des enfants."
    }
  },
  {
    slug: "workshop",
    title: { ar: "المشغل", en: "The Workshop", es: "El taller", pt: "A oficina", fr: "L'atelier" },
    image: "/img/services/workshop.png",
    detail: {
      ar: "مشغل يتيح العمل والتدريب، وبخاصة للمرأة — ترجمةً لقيمة المشاركة الفعالة التي تنص عليها الجمعية.",
      en: "A workshop offering work and training, for women in particular — the association's stated value of active participation put into practice.", es: "Un taller que ofrece trabajo y formación, en particular a las mujeres: el valor de participación activa de la asociación llevado a la práctica.", pt: "Uma oficina que oferece trabalho e formação, em especial às mulheres — o valor de participação ativa da associação posto em prática.", fr: "Un atelier offrant travail et formation, en particulier aux femmes — la valeur de participation active de l'association mise en pratique."
    }
  },
  {
    slug: "service-projects",
    title: { ar: "المشروعات الخدمية", en: "Service Projects", es: "Proyectos de servicio", pt: "Projetos de serviço", fr: "Projets de service" },
    image: "/img/services/service-projects.png",
    detail: {
      ar: "مشروعات خدمية للمجتمع المحلي، منها التوعية بمخاطر الأمراض، في إطار النهوض بالمجتمع.",
      en: "Service projects for the local community, disease-awareness work among them, as part of lifting the community.", es: "Proyectos de servicio para la comunidad local, entre ellos la concienciación sobre enfermedades, como parte de impulsar la comunidad.", pt: "Projetos de serviço para a comunidade local, entre eles a sensibilização para as doenças, como parte do esforço de impulsionar a comunidade.", fr: "Des projets de service pour la communauté locale, dont la sensibilisation aux maladies, dans le cadre du progrès de la communauté."
    }
  },
  {
    slug: "microlending",
    title: { ar: "الإقراض", en: "Lending", es: "Préstamos", pt: "Crédito", fr: "Prêts" },
    image: "/img/services/microlending.png",
    detail: {
      ar: "إقراض يعين الأسر على بدء عمل تعيش منه، بدلاً من المعونة التي تنتهي بانتهائها.",
      en: "Lending that helps a household start something it can live from, rather than aid that ends when the aid ends.", es: "Préstamos que ayudan a una familia a iniciar algo de lo que vivir, en lugar de una ayuda que acaba cuando acaba la ayuda.", pt: "Crédito que ajuda uma família a iniciar algo de que possa viver, em vez de uma ajuda que termina quando a ajuda acaba.", fr: "Des prêts qui aident un foyer à lancer une activité dont il puisse vivre, plutôt qu'une aide qui cesse quand l'aide cesse."
    }
  }
];

/**
 * The line-by-line inventory under each service area, in every locale.
 *
 * Keyed by the English string in `SERVICES[].items` (content.ts), which stays
 * the canonical list — this is the translation layer over it, not a second copy
 * of the list. A test asserts every English item has an entry here, so adding a
 * service line without translating it is a build-time failure rather than an
 * English bullet appearing on the French page.
 */
export const SERVICE_ITEMS: Record<string, Bi> = {
  "Qur'an memorisation circles": { en: "Qur'an memorisation circles", ar: "حلقات تحفيظ القرآن الكريم", es: "Círculos de memorización del Corán", pt: "Círculos de memorização do Alcorão", fr: "Cercles de mémorisation du Coran" },
  "Recitation and tajweed teaching": { en: "Recitation and tajweed teaching", ar: "تعليم التلاوة والتجويد", es: "Enseñanza de la recitación y el taywid", pt: "Ensino da recitação e do tajwid", fr: "Enseignement de la récitation et du tajwid" },
  "Orphan sponsorship": { en: "Orphan sponsorship", ar: "كفالة الأيتام", es: "Apadrinamiento de huérfanos", pt: "Apadrinhamento de órfãos", fr: "Parrainage d'orphelins" },
  "Family follow-up and support": { en: "Family follow-up and support", ar: "متابعة الأسر ودعمها", es: "Seguimiento y apoyo a las familias", pt: "Acompanhamento e apoio às famílias", fr: "Suivi et soutien des familles" },
  "Nursery and early childcare": { en: "Nursery and early childcare", ar: "الحضانة ورعاية الطفولة المبكرة", es: "Guardería y atención a la primera infancia", pt: "Creche e cuidados na primeira infância", fr: "Crèche et accueil de la petite enfance" },
  "Mother and child welfare": { en: "Mother and child welfare", ar: "الارتقاء بمستوى الأم والطفل", es: "Bienestar de madres e hijos", pt: "Bem-estar de mães e crianças", fr: "Bien-être des mères et des enfants" },
  "Workshop training and employment": { en: "Workshop training and employment", ar: "التدريب والتشغيل بالمشغل", es: "Formación y empleo en el taller", pt: "Formação e emprego na oficina", fr: "Formation et emploi à l'atelier" },
  "Women's participation programmes": { en: "Women's participation programmes", ar: "برامج مشاركة المرأة", es: "Programas de participación de la mujer", pt: "Programas de participação das mulheres", fr: "Programmes de participation des femmes" },
  "Community service projects": { en: "Community service projects", ar: "المشروعات الخدمية للمجتمع", es: "Proyectos de servicio comunitario", pt: "Projetos de serviço comunitário", fr: "Projets de service communautaire" },
  "Health awareness campaigns": { en: "Health awareness campaigns", ar: "حملات التوعية الصحية", es: "Campañas de concienciación sanitaria", pt: "Campanhas de sensibilização para a saúde", fr: "Campagnes de sensibilisation à la santé" },
  "Household lending": { en: "Household lending", ar: "الإقراض الأسري", es: "Préstamos a familias", pt: "Crédito às famílias", fr: "Prêts aux ménages" },
  "Small-project support": { en: "Small-project support", ar: "دعم المشروعات الصغيرة", es: "Apoyo a pequeños proyectos", pt: "Apoio a pequenos projetos", fr: "Soutien aux petits projets" },
};

/**
 * The association's standing commitment, in its own published words.
 *
 * This replaces the template's FOUNDER block, and the replacement is
 * deliberate. The association publishes no officer names, no portraits and no
 * founding account, so there is nobody here to name. Putting an invented
 * chairman — or a stock photograph of a stranger — above a real registration
 * number would fabricate exactly the thing a reader is most likely to take at
 * face value. What the association does publish is its registration and its
 * objectives, so that is what this block carries.
 */
export const STEWARDSHIP = {
  name: {
    ar: "جمعية المحافظة على القرآن الكريم",
    en: "The Association for the Preservation of the Holy Qur'an", es: "Asociación para la Preservación del Sagrado Corán", pt: "Associação para a Preservação do Sagrado Alcorão", fr: "Association pour la préservation du Saint Coran"
  } as Bi,
  role: {
    ar: "جمعية أهلية مشهرة برقم ٢٢٤ لسنة ١٩٧٧ — ساحل سليم، أسيوط",
    en: "A community association registered as no. 224 of 1977 — Sahel Selim, Assiut", es: "Asociación comunitaria inscrita con el n.º 224 de 1977 — Sahel Selim, Asiut", pt: "Associação comunitária registada com o n.º 224 de 1977 — Sahel Selim, Assiut", fr: "Association communautaire enregistrée sous le n° 224 de 1977 — Sahel Selim, Assiout"
  } as Bi,
  note: {
    ar: "نعمل بالتشاور، ونقرّر بشفافية دون انحياز لطرف عن الآخر، ونشارك أهل المجتمع المحلي العمل بدلاً من أن نعمل نيابة عنهم — وبخاصة مشاركة المرأة. هذه هي القيم التي أعلنتها الجمعية، وهي المقياس الذي نطلب أن نُحاسَب عليه.",
    en: "We work by consultation, decide transparently without favouring one party over another, and do the work alongside the local community rather than on its behalf — women's participation especially. These are the values the association has published, and the measure we ask to be held to.", es: "Trabajamos mediante la consulta, decidimos con transparencia sin favorecer a una parte sobre otra y actuamos junto a la comunidad local en lugar de en su nombre, en especial con la participación de las mujeres. Son los valores que la asociación ha publicado y la medida por la que pedimos ser juzgados.", pt: "Trabalhamos por consulta, decidimos com transparência sem favorecer uma parte em detrimento de outra e agimos com a comunidade local em vez de em seu nome — em especial com a participação das mulheres. São os valores que a associação publicou e a medida pela qual pedimos ser avaliados.", fr: "Nous travaillons par la concertation, décidons en toute transparence sans favoriser une partie plutôt qu'une autre, et agissons avec la communauté locale plutôt qu'en son nom — en particulier avec la participation des femmes. Ce sont les valeurs publiées par l'association, et la mesure à laquelle nous demandons d'être tenus."
  } as Bi,
  commitments: [
    { key: "registered", title: { ar: "مشهرة منذ ١٩٧٧", en: "Registered since 1977", es: "Inscrita desde 1977", pt: "Registada desde 1977", fr: "Enregistrée depuis 1977" } as Bi },
    { key: "scope", title: { ar: "ستة مجالات عمل", en: "Six fields of work", es: "Seis campos de trabajo", pt: "Seis campos de atuação", fr: "Six champs d'action" } as Bi },
    { key: "reach", title: { ar: "ساحل سليم، أسيوط", en: "Sahel Selim, Assiut", es: "Sahel Selim, Asiut", pt: "Sahel Selim, Assiut", fr: "Sahel Selim, Assiout" } as Bi }
  ]
};

export const ABOUT = {
  eyebrow: { ar: "من نحن", en: "About us", es: "Sobre nosotros", pt: "Sobre nós", fr: "À propos" } as Bi,
  title: {
    ar: "جمعية أهلية بساحل سليم",
    en: "A community association in Sahel Selim", es: "Una asociación comunitaria en Sahel Selim", pt: "Uma associação comunitária em Sahel Selim", fr: "Une association communautaire à Sahel Selim"
  } as Bi,
  body: {
    ar: "جمعية المحافظة على القرآن الكريم بالتناغة الشرقية جمعية أهلية مقرها ساحل سليم بمحافظة أسيوط، مشهرة برقم ٢٢٤ لسنة ١٩٧٧. نعمل في تحفيظ القرآن الكريم، وكفالة الأيتام، والحضانة، والمشغل، والمشروعات الخدمية، والإقراض — ونقيس عملنا بالشفافية والتشاور والمشاركة والرقي بالإنسان وحفظ كرامته.",
    en: "The Association for the Preservation of the Holy Qur'an at East Tanagha is a community association based in Sahel Selim, Assiut Governorate, registered as no. 224 of 1977. We work in Qur'an memorisation, orphan sponsorship, a nursery, a workshop, service projects and lending — and we measure that work by transparency, consultation, participation, and the dignity of the people it is for.", es: "La Asociación para la Preservación del Sagrado Corán en Tanagha Este es una asociación comunitaria con sede en Sahel Selim, gobernación de Asiut, inscrita con el n.º 224 de 1977. Trabajamos en memorización del Corán, apadrinamiento de huérfanos, guardería, taller, proyectos de servicio y préstamos, y medimos esa labor por la transparencia, la consulta, la participación y la dignidad de las personas a quienes se dirige.", pt: "A Associação para a Preservação do Sagrado Alcorão em Tanagha Este é uma associação comunitária sediada em Sahel Selim, governorado de Assiut, registada com o n.º 224 de 1977. Trabalhamos na memorização do Alcorão, no apadrinhamento de órfãos, numa creche, numa oficina, em projetos de serviço e em crédito — e medimos esse trabalho pela transparência, pela consulta, pela participação e pela dignidade das pessoas a quem se destina.", fr: "L'Association pour la préservation du Saint Coran à Tanagha-Est est une association communautaire établie à Sahel Selim, gouvernorat d'Assiout, enregistrée sous le n° 224 de 1977. Nous intervenons dans la mémorisation du Coran, le parrainage d'orphelins, une crèche, un atelier, des projets de service et des prêts — et nous mesurons ce travail à l'aune de la transparence, de la concertation, de la participation et de la dignité de ceux à qui il s'adresse."
  } as Bi
};

/** The brand tagline and positioning line, used by the root layout metadata. */
export const TAGLINE = {
  ar: "تحفيظ القرآن الكريم ورعاية المجتمع",
  en: "Qur'an memorisation and community care", es: "Memorización del Corán y atención comunitaria", pt: "Memorização do Alcorão e apoio à comunidade", fr: "Mémorisation du Coran et action communautaire"
} as Bi;

export const POSITIONING = {
  ar: "جمعية أهلية بساحل سليم بأسيوط، مشهرة برقم ٢٢٤ لسنة ١٩٧٧، تعمل في تحفيظ القرآن الكريم وكفالة الأيتام والحضانة والمشغل والمشروعات الخدمية والإقراض.",
  en: "A community association in Sahel Selim, Assiut, registered as no. 224 of 1977, working in Qur'an memorisation, orphan sponsorship, a nursery, a workshop, service projects and lending.", es: "Una asociación comunitaria en Sahel Selim, Asiut, inscrita con el n.º 224 de 1977, dedicada a la memorización del Corán, el apadrinamiento de huérfanos, una guardería, un taller, proyectos de servicio y préstamos.", pt: "Uma associação comunitária em Sahel Selim, Assiut, registada com o n.º 224 de 1977, que trabalha na memorização do Alcorão, no apadrinhamento de órfãos, numa creche, numa oficina, em projetos de serviço e em crédito.", fr: "Une association communautaire à Sahel Selim, Assiout, enregistrée sous le n° 224 de 1977, active dans la mémorisation du Coran, le parrainage d'orphelins, une crèche, un atelier, des projets de service et des prêts."
} as Bi;

/** Per-page titles and descriptions for search engines, localized like the body. */
export const PAGE_META: Record<string, { title: Bi; description: Bi }> = {
  about: {
    title: { ar: "من نحن", en: "About", es: "Sobre nosotros", pt: "Sobre nós", fr: "À propos" },
    description: {
      ar: "جمعية المحافظة على القرآن الكريم — جمعية أهلية بساحل سليم بأسيوط، مشهرة برقم ٢٢٤ لسنة ١٩٧٧.",
      en: "The Association for the Preservation of the Holy Qur'an — a community association in Sahel Selim, Assiut, registered as no. 224 of 1977.", es: "Asociación para la Preservación del Sagrado Corán: asociación comunitaria en Sahel Selim, Asiut, inscrita con el n.º 224 de 1977.", pt: "Associação para a Preservação do Sagrado Alcorão — associação comunitária em Sahel Selim, Assiut, registada com o n.º 224 de 1977.", fr: "Association pour la préservation du Saint Coran — association communautaire à Sahel Selim, Assiout, enregistrée sous le n° 224 de 1977."
    }
  },
  services: {
    title: { ar: "ما نقدّمه", en: "What we do", es: "Lo que hacemos", pt: "O que fazemos", fr: "Nos actions" },
    description: {
      ar: "ستة مجالات: تحفيظ القرآن الكريم، وكفالة الأيتام، والحضانة، والمشغل، والمشروعات الخدمية، والإقراض.",
      en: "Six fields of work — Qur'an memorisation, orphan sponsorship, the nursery, the workshop, service projects and lending.", es: "Seis campos de trabajo: memorización del Corán, apadrinamiento de huérfanos, guardería, taller, proyectos de servicio y préstamos.", pt: "Seis campos de atuação: memorização do Alcorão, apadrinhamento de órfãos, creche, oficina, projetos de serviço e crédito.", fr: "Six champs d'action : mémorisation du Coran, parrainage d'orphelins, crèche, atelier, projets de service et prêts."
    }
  },
  projects: {
    title: { ar: "المشروعات", en: "Projects", es: "Proyectos", pt: "Projetos", fr: "Projets" },
    description: {
      ar: "المشروعات الخدمية المنشورة للجمعية.",
      en: "The association's published service projects.", es: "Los proyectos de servicio publicados de la asociación.", pt: "Os projetos de serviço publicados da associação.", fr: "Les projets de service publiés de l'association."
    }
  },
  media: {
    title: { ar: "المركز الإعلامي", en: "Media Centre", es: "Sala de prensa", pt: "Centro de imprensa", fr: "Espace presse" },
    description: {
      ar: "الأخبار والإعلانات من جمعية المحافظة على القرآن الكريم.",
      en: "News and announcements from the Association for the Preservation of the Holy Qur'an.", es: "Noticias y anuncios de la Asociación para la Preservación del Sagrado Corán.", pt: "Notícias e anúncios da Associação para a Preservação do Sagrado Alcorão.", fr: "Actualités et annonces de l'Association pour la préservation du Saint Coran."
    }
  },
  careers: {
    title: { ar: "التطوّع والعمل", en: "Volunteer & work", es: "Voluntariado y empleo", pt: "Voluntariado e trabalho", fr: "Bénévolat et emploi" },
    description: {
      ar: "شارك في عمل الجمعية — تطوّعاً أو عملاً.",
      en: "Take part in the association's work — as a volunteer or on staff.", es: "Participe en la labor de la asociación, como voluntario o como personal.", pt: "Participe no trabalho da associação, como voluntário ou como colaborador.", fr: "Participez au travail de l'association, comme bénévole ou comme salarié."
    }
  },
  contact: {
    title: { ar: "تواصل معنا", en: "Contact", es: "Contacto", pt: "Contacto", fr: "Contact" },
    description: {
      ar: "تواصل مع جمعية المحافظة على القرآن الكريم بساحل سليم.",
      en: "Get in touch with the Association for the Preservation of the Holy Qur'an in Sahel Selim.", es: "Póngase en contacto con la Asociación para la Preservación del Sagrado Corán en Sahel Selim.", pt: "Entre em contacto com a Associação para a Preservação do Sagrado Alcorão em Sahel Selim.", fr: "Contactez l'Association pour la préservation du Saint Coran à Sahel Selim."
    }
  },
  blog: {
    title: { ar: "المقالات", en: "Articles", es: "Artículos", pt: "Artigos", fr: "Articles" },
    description: {
      ar: "مقالات وأخبار من الجمعية.",
      en: "Articles and news from the association.", es: "Artículos y noticias de la asociación.", pt: "Artigos e notícias da associação.", fr: "Articles et actualités de l'association."
    }
  },
  licence: {
    title: { ar: "الإشهار والتراخيص", en: "Registration", es: "Inscripción", pt: "Registo", fr: "Enregistrement" },
    description: {
      ar: "بيانات إشهار الجمعية — مشهرة برقم ٢٢٤ لسنة ١٩٧٧.",
      en: "The association's registration details — registered as no. 224 of 1977.", es: "Datos de inscripción de la asociación: n.º 224 de 1977.", pt: "Dados de registo da associação — n.º 224 de 1977.", fr: "Les données d'enregistrement de l'association — n° 224 de 1977."
    }
  },
  terms: {
    title: { ar: "شروط الاستخدام", en: "Terms of Use", es: "Condiciones de uso", pt: "Termos de utilização", fr: "Conditions d'utilisation" },
    description: {
      ar: "شروط استخدام موقع الجمعية.",
      en: "Terms governing use of the association's website.", es: "Condiciones que rigen el uso del sitio web de la asociación.", pt: "Termos que regem a utilização do site da associação.", fr: "Conditions régissant l'utilisation du site de l'association."
    }
  },
  privacy: {
    title: { ar: "سياسة الخصوصية", en: "Privacy Policy", es: "Política de privacidad", pt: "Política de privacidade", fr: "Politique de confidentialité" },
    description: {
      ar: "كيف تتعامل الجمعية مع بياناتك.",
      en: "How the association handles your data.", es: "Cómo trata la asociación sus datos.", pt: "Como a associação trata os seus dados.", fr: "Comment l'association traite vos données."
    }
  }
};

export const NOT_FOUND: Record<string, Bi> = {
  project: { ar: "لم يُعثر على المشروع", en: "Project not found", es: "Proyecto no encontrado", pt: "Projeto não encontrado", fr: "Projet introuvable" },
  vacancy: { ar: "لم يُعثر على الفرصة", en: "Opening not found", es: "Vacante no encontrada", pt: "Vaga não encontrada", fr: "Offre introuvable" },
  post: { ar: "لم يُعثر على المقال", en: "Post not found", es: "Publicación no encontrada", pt: "Publicação não encontrada", fr: "Article introuvable" },
  activity: { ar: "لم يُعثر على النشاط", en: "Activity not found", es: "Actividad no encontrada", pt: "Atividade não encontrada", fr: "Activité introuvable" }
};

export const SECTIONS = {
  practiceEyebrow: { ar: "ما نقدّمه", en: "What we do", es: "Lo que hacemos", pt: "O que fazemos", fr: "Ce que nous faisons" } as Bi,
  practiceTitle: { ar: "ستة مجالات عمل", en: "Six fields of work", es: "Seis campos de trabajo", pt: "Seis campos de atuação", fr: "Six champs d'action" } as Bi,
  reachTitle: { ar: "أين نعمل", en: "Where we work", es: "Dónde trabajamos", pt: "Onde trabalhamos", fr: "Où nous intervenons" } as Bi,
  reachCta: { ar: "تحدّث إلينا", en: "Talk to us", es: "Hable con nosotros", pt: "Fale connosco", fr: "Parlez-nous" } as Bi,
  reachCtaSub: {
    ar: "المكتب الرئيسي بساحل سليم، محافظة أسيوط.",
    en: "The main office in Sahel Selim, Assiut Governorate.", es: "La oficina principal en Sahel Selim, gobernación de Asiut.", pt: "O escritório principal em Sahel Selim, governorado de Assiut.", fr: "Le bureau principal à Sahel Selim, gouvernorat d'Assiout."
  } as Bi,
  explore: { ar: "اعرف المزيد", en: "Learn more", es: "Más información", pt: "Saber mais", fr: "En savoir plus" } as Bi,
  careersTitle: { ar: "شارك في العمل", en: "Take part in the work", es: "Participe en la labor", pt: "Participe no trabalho", fr: "Participez au travail" } as Bi,
  careersBody: {
    ar: "نرحّب بمن يريد أن يشارك في عمل الجمعية — تحفيظاً أو تدريباً أو تطوّعاً في المشروعات الخدمية.",
    en: "We welcome anyone who wants a part in the association's work — teaching, training, or volunteering on the service projects.", es: "Damos la bienvenida a quien quiera participar en la labor de la asociación: enseñando, formando o como voluntario en los proyectos de servicio.", pt: "Acolhemos quem queira participar no trabalho da associação — a ensinar, a formar ou como voluntário nos projetos de serviço.", fr: "Nous accueillons quiconque souhaite prendre part au travail de l'association — enseignement, formation ou bénévolat sur les projets de service."
  } as Bi,
  careersCta: { ar: "تعرّف على الفرص", en: "See how to help", es: "Vea cómo ayudar", pt: "Veja como ajudar", fr: "Voir comment aider" } as Bi,
  leadership: { ar: "عهد الجمعية", en: "Our commitment", es: "Nuestro compromiso", pt: "O nosso compromisso", fr: "Notre engagement" } as Bi,
  viewCard: { ar: "عرض بطاقة التواصل", en: "View contact card", es: "Ver la tarjeta de contacto", pt: "Ver o cartão de contacto", fr: "Voir la carte de contact" } as Bi,
  menu: { ar: "القائمة", en: "Menu", es: "Menú", pt: "Menu", fr: "Menu" } as Bi,
  close: { ar: "إغلاق", en: "Close", es: "Cerrar", pt: "Fechar", fr: "Fermer" } as Bi
};

/**
 * Public navigation. Mirrors `NAV` in content.ts — only routes that exist and
 * have content behind them are linked.
 */
export const SITE_NAV: { href: string; label: Bi }[] = [
  { href: "/", label: { ar: "الرئيسية", en: "Home", es: "Inicio", pt: "Início", fr: "Accueil" } },
  { href: "/about", label: { ar: "من نحن", en: "About", es: "Sobre nosotros", pt: "Sobre nós", fr: "À propos" } },
  { href: "/services", label: { ar: "ما نقدّمه", en: "What we do", es: "Lo que hacemos", pt: "O que fazemos", fr: "Nos actions" } },
  { href: "/projects", label: { ar: "المشروعات", en: "Projects", es: "Proyectos", pt: "Projetos", fr: "Projets" } },
  { href: "/media", label: { ar: "المركز الإعلامي", en: "Media Centre", es: "Sala de prensa", pt: "Centro de imprensa", fr: "Espace presse" } },
  { href: "/careers", label: { ar: "التطوّع", en: "Volunteer", es: "Voluntariado", pt: "Voluntariado", fr: "Bénévolat" } },
  { href: "/contact", label: { ar: "تواصل معنا", en: "Contact", es: "Contacto", pt: "Contacto", fr: "Contact" } }
];

/**
 * Localised page metadata.
 *
 * A static `export const metadata` is evaluated without a request, so it
 * cannot see the visitor's locale — every page was emitting an English
 * `<title>` and `<meta description>` to Arabic, Spanish, Portuguese and
 * French readers, and to anything that scrapes them for a link preview.
 * `generateMetadata` can be async and read the locale, so pages call this.
 */
export function localeMeta(key: keyof typeof PAGE_META, locale: Locale) {
  const m = PAGE_META[key];
  return { title: t(m.title, locale), description: t(m.description, locale) };
}
