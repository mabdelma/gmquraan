import type { Locale } from "./i18n";

/**
 * Translatable strings for the surfaces that read from a locale dictionary
 * rather than from the `Bi` objects in brand-content.ts: the contact cards,
 * the footer, and the three site-content sections that /central/site-content
 * seeds and edits.
 *
 * `services`, `why.items` and `operating.items` are aligned **by index** with
 * `SERVICES`, `DIFFERENTIATORS` and `OPERATING_MODEL` in content.ts — that is
 * how `defaultCards()` in site-cards.ts pairs a row with its copy, so the
 * counts (6, 6, 5) and the ordering must match or the editor seeds the wrong
 * text against the wrong row. The English titles must also match content.ts
 * word for word: a test resolves the "en" section and compares the two lists.
 *
 * Sections that the old product's marketing pages used (hero, pricing, the
 * about/contact/services page copy) are gone rather than translated: the
 * public pages render from brand-content.ts now, and five locales of copy that
 * nothing reads is five locales of copy that silently rots.
 */
export interface Messages {
  nav: { services: string; projects: string; media: string; about: string; contact: string; careers: string };
  cards: { eyebrow: string; title: string; subtitle: string; openCard: string; roles: { founder: string; ops: string; chairman: string }; contact: string; connect: string; location: string; primaryMobile: string; secondaryMobile: string; company: string; save: string; viewBack: string; viewFront: string; scanHint: string; pdf: string };
  services: { title: string; blurb: string }[]; // 6, aligned to SERVICES
  why: { eyebrow: string; title: string; items: { title: string; blurb: string }[] }; // 6, aligned to DIFFERENTIATORS
  operating: { eyebrow: string; title: string; items: { title: string; blurb: string }[] }; // 5, aligned to OPERATING_MODEL
  footer: { explore: string; getInTouch: string; founded: string; rights: string; privacy: string; terms: string; sitemap: string; digitalCard: string; developedBy: string };
}

/**
 * The card role labels describe the office, not named individuals. The
 * association publishes no officer names against any role (see LEADERSHIP in
 * content.ts), so these stay as places you can reach rather than titles
 * attached to a person.
 */

const en: Messages = {
  nav: { services: "What We Do", projects: "Projects", media: "Media Centre", about: "About", contact: "Contact", careers: "Volunteer" },
  cards: { eyebrow: "Contact", title: "Reach the association", subtitle: "Open the card, then scan the QR code or tap Save Contact to add us straight to your phone.", openCard: "Open card", roles: { founder: "Main office", ops: "Administration", chairman: "Main office" }, contact: "Contact", connect: "Connect", location: "Location", primaryMobile: "Mobile", secondaryMobile: "Landline", company: "Association", save: "Save Contact", viewBack: "View Back", viewFront: "View Front", scanHint: "Scan to save contact", pdf: "Save as PDF" },
  services: [
    { title: "Qur'an Memorisation", blurb: "Circles for memorising the Qur'an and learning recitation — the work the association was founded on when it was registered in 1977." },
    { title: "Orphan Sponsorship", blurb: "Sponsoring orphans and staying with their families, in a way that protects their dignity rather than making help a favour." },
    { title: "Nursery", blurb: "A nursery for the children of the local community, under the association's aim of improving the lot of mothers and children." },
    { title: "The Workshop", blurb: "A workshop offering work and training, for women in particular — the association's stated value of active participation put into practice." },
    { title: "Service Projects", blurb: "Service projects for the local community, disease-awareness work among them, as part of lifting the community." },
    { title: "Lending", blurb: "Lending that helps a household start something it can live from, rather than aid that ends when the aid ends." }
  ],
  why: { eyebrow: "Why this association", title: "What the association stands on", items: [
    { title: "Registered Since 1977", blurb: "A community association registered as no. 224 of 1977 — nearly fifty years of standing in the same place, for the same people." },
    { title: "Transparent Decisions", blurb: "Decisions taken transparently, without favouring one party over another, in the common interest — the association's own first stated value." },
    { title: "Decided By Consultation", blurb: "Consultation so that responsibility is genuinely shared, rather than decisions handed down and carried out by someone else." },
    { title: "Women's Participation", blurb: "Active participation by the local community, women's participation named explicitly among the association's values and carried into the workshop." },
    { title: "Dignity First", blurb: "Raising people up and preserving their dignity, treated as the thing a community's life depends on rather than a courtesy." },
    { title: "Six Fields, One Association", blurb: "Memorisation, orphan care, the nursery, the workshop, service projects and lending — held together rather than split across bodies that never meet." }
  ] },
  operating: { eyebrow: "How we work", title: "Five stages, one association", items: [
    { title: "Reach Out", blurb: "A visit or a call to the main office in Sahel Selim." },
    { title: "Understand The Need", blurb: "Listening to the household and to the local community around it." },
    { title: "Consult", blurb: "The decision taken by consultation, transparently and without favour." },
    { title: "Deliver", blurb: "Memorisation, sponsorship, nursery place, training, a project or a loan." },
    { title: "Stay With It", blurb: "Follow-up with the family, because the need rarely ends with the first answer." }
  ] },
  footer: { explore: "Explore", getInTouch: "Get in touch", founded: "Registered since 1977 · Sahel Selim, Assiut, Egypt", rights: "All rights reserved.", privacy: "Privacy policy", terms: "Terms & conditions", sitemap: "Sitemap", digitalCard: "Contact card", developedBy: "Developed and Owned by" }
};

const ar: Messages = {
  nav: { services: "ما نقدّمه", projects: "المشروعات", media: "المركز الإعلامي", about: "من نحن", contact: "تواصل معنا", careers: "التطوّع" },
  cards: { eyebrow: "التواصل", title: "تواصل مع الجمعية", subtitle: "افتح البطاقة، ثم امسح رمز الاستجابة السريعة أو اضغط حفظ جهة الاتصال لإضافتنا إلى هاتفك مباشرة.", openCard: "فتح البطاقة", roles: { founder: "المقر الرئيسي", ops: "الإدارة", chairman: "المقر الرئيسي" }, contact: "التواصل", connect: "تواصل", location: "الموقع", primaryMobile: "محمول", secondaryMobile: "أرضي", company: "الجمعية", save: "حفظ جهة الاتصال", viewBack: "عرض الخلف", viewFront: "عرض الأمام", scanHint: "امسح لحفظ جهة الاتصال", pdf: "حفظ بصيغة PDF" },
  services: [
    { title: "تحفيظ القرآن الكريم", blurb: "حلقات لتحفيظ القرآن الكريم وتعليم التلاوة — وهي العمل الذي قامت عليه الجمعية منذ إشهارها سنة ١٩٧٧." },
    { title: "كفالة الأيتام", blurb: "كفالة الأيتام ومتابعة أسرهم، بما يحفظ كرامتهم ولا يجعل العون منّة." },
    { title: "الحضانة", blurb: "حضانة لأطفال المجتمع المحلي، ضمن هدف الجمعية في الارتقاء بمستوى الأم والطفل." },
    { title: "المشغل", blurb: "مشغل يتيح العمل والتدريب، وبخاصة للمرأة — ترجمةً لقيمة المشاركة الفعالة التي تنص عليها الجمعية." },
    { title: "المشروعات الخدمية", blurb: "مشروعات خدمية للمجتمع المحلي، منها التوعية بمخاطر الأمراض، في إطار النهوض بالمجتمع." },
    { title: "الإقراض", blurb: "إقراض يعين الأسر على بدء عمل تعيش منه، بدلاً من المعونة التي تنتهي بانتهائها." }
  ],
  why: { eyebrow: "لماذا هذه الجمعية", title: "ما تقوم عليه الجمعية", items: [
    { title: "مشهرة منذ ١٩٧٧", blurb: "جمعية أهلية مشهرة برقم ٢٢٤ لسنة ١٩٧٧ — قرابة خمسين عاماً في المكان نفسه، ولأهله أنفسهم." },
    { title: "قرارات شفافة", blurb: "قرارات تُتخذ بشفافية دون انحياز لطرف عن الآخر وبما يحقق الصالح العام — وهي أول قيمة أعلنتها الجمعية." },
    { title: "التشاور قبل القرار", blurb: "التشاور لضمان تحمّل المسئولية ومشاركتها، لا قرارات تُملى ثم ينفّذها غير أصحابها." },
    { title: "مشاركة المرأة", blurb: "مشاركة فعالة من المجتمع المحلي، ومشاركة المرأة منصوص عليها صراحةً في قيم الجمعية ومترجَمة في المشغل." },
    { title: "الكرامة أولاً", blurb: "الرقي بالإنسان وحفظ كرامته، بوصفه ما تقوم عليه حياة المجتمع لا مجرد مجاملة." },
    { title: "ستة مجالات، جمعية واحدة", blurb: "التحفيظ وكفالة الأيتام والحضانة والمشغل والمشروعات الخدمية والإقراض — مجتمعة، لا موزّعة على جهات لا تلتقي." }
  ] },
  operating: { eyebrow: "كيف نعمل", title: "خمس مراحل، جمعية واحدة", items: [
    { title: "التواصل", blurb: "زيارة أو اتصال بالمقر الرئيسي بساحل سليم." },
    { title: "فهم الحاجة", blurb: "الإنصات إلى الأسرة وإلى المجتمع المحلي من حولها." },
    { title: "التشاور", blurb: "القرار يُتخذ بالتشاور، بشفافية ودون انحياز." },
    { title: "التنفيذ", blurb: "تحفيظ أو كفالة أو مكان بالحضانة أو تدريب أو مشروع أو قرض." },
    { title: "المتابعة", blurb: "متابعة مع الأسرة، فالحاجة قلّما تنتهي عند أول استجابة." }
  ] },
  footer: { explore: "تصفّح", getInTouch: "تواصل معنا", founded: "مشهرة منذ ١٩٧٧ · ساحل سليم، أسيوط، مصر", rights: "جميع الحقوق محفوظة.", privacy: "سياسة الخصوصية", terms: "الشروط والأحكام", sitemap: "خريطة الموقع", digitalCard: "بطاقة التواصل", developedBy: "تطوير وملكية" }
};

const es: Messages = {
  nav: { services: "Lo que hacemos", projects: "Proyectos", media: "Sala de prensa", about: "Sobre nosotros", contact: "Contacto", careers: "Voluntariado" },
  cards: { eyebrow: "Contacto", title: "Contacte con la asociación", subtitle: "Abra la tarjeta y escanee el código QR o pulse Guardar contacto para añadirnos al teléfono.", openCard: "Abrir tarjeta", roles: { founder: "Oficina principal", ops: "Administración", chairman: "Oficina principal" }, contact: "Contacto", connect: "Conectar", location: "Ubicación", primaryMobile: "Móvil", secondaryMobile: "Fijo", company: "Asociación", save: "Guardar contacto", viewBack: "Ver reverso", viewFront: "Ver anverso", scanHint: "Escanee para guardar el contacto", pdf: "Guardar en PDF" },
  services: [
    { title: "Memorización del Corán", blurb: "Círculos para memorizar el Corán y aprender la recitación: la labor sobre la que se fundó la asociación al inscribirse en 1977." },
    { title: "Apadrinamiento de huérfanos", blurb: "Apadrinar a los huérfanos y acompañar a sus familias, de modo que se proteja su dignidad y la ayuda no sea un favor." },
    { title: "Guardería", blurb: "Una guardería para los niños de la comunidad local, dentro del objetivo de mejorar la situación de madres e hijos." },
    { title: "El taller", blurb: "Un taller que ofrece trabajo y formación, en particular a las mujeres: el valor de participación activa llevado a la práctica." },
    { title: "Proyectos de servicio", blurb: "Proyectos de servicio para la comunidad local, entre ellos la concienciación sobre enfermedades, como parte de impulsar la comunidad." },
    { title: "Préstamos", blurb: "Préstamos que ayudan a una familia a iniciar algo de lo que vivir, en lugar de una ayuda que acaba cuando acaba la ayuda." }
  ],
  why: { eyebrow: "Por qué esta asociación", title: "Sobre qué se sostiene la asociación", items: [
    { title: "Inscrita desde 1977", blurb: "Una asociación comunitaria inscrita con el n.º 224 de 1977: casi cincuenta años en el mismo lugar y para la misma gente." },
    { title: "Decisiones transparentes", blurb: "Decisiones tomadas con transparencia, sin favorecer a una parte sobre otra y en bien del interés común: su primer valor declarado." },
    { title: "Decidido por consulta", blurb: "Consulta para que la responsabilidad se comparta de verdad, en lugar de decisiones impuestas y ejecutadas por otros." },
    { title: "Participación de la mujer", blurb: "Participación activa de la comunidad local, con la de las mujeres nombrada explícitamente entre sus valores y llevada al taller." },
    { title: "La dignidad primero", blurb: "Elevar a la persona y preservar su dignidad, como aquello de lo que depende la vida de una comunidad y no como cortesía." },
    { title: "Seis campos, una asociación", blurb: "Memorización, huérfanos, guardería, taller, proyectos de servicio y préstamos: unidos, no repartidos entre organismos que nunca se encuentran." }
  ] },
  operating: { eyebrow: "Cómo trabajamos", title: "Cinco etapas, una asociación", items: [
    { title: "Contactar", blurb: "Una visita o una llamada a la oficina principal en Sahel Selim." },
    { title: "Entender la necesidad", blurb: "Escuchar a la familia y a la comunidad local que la rodea." },
    { title: "Consultar", blurb: "La decisión se toma por consulta, con transparencia y sin favoritismos." },
    { title: "Responder", blurb: "Memorización, apadrinamiento, plaza de guardería, formación, un proyecto o un préstamo." },
    { title: "Acompañar", blurb: "Seguimiento con la familia, porque la necesidad rara vez acaba con la primera respuesta." }
  ] },
  footer: { explore: "Explorar", getInTouch: "Contacto", founded: "Inscrita desde 1977 · Sahel Selim, Asiut, Egipto", rights: "Todos los derechos reservados.", privacy: "Política de privacidad", terms: "Términos y condiciones", sitemap: "Mapa del sitio", digitalCard: "Tarjeta de contacto", developedBy: "Desarrollado y propiedad de" }
};

const pt: Messages = {
  nav: { services: "O que fazemos", projects: "Projetos", media: "Centro de imprensa", about: "Sobre nós", contact: "Contacto", careers: "Voluntariado" },
  cards: { eyebrow: "Contacto", title: "Contacte a associação", subtitle: "Abra o cartão e leia o código QR ou toque em Guardar contacto para nos adicionar ao telemóvel.", openCard: "Abrir cartão", roles: { founder: "Escritório principal", ops: "Administração", chairman: "Escritório principal" }, contact: "Contacto", connect: "Ligar", location: "Localização", primaryMobile: "Telemóvel", secondaryMobile: "Fixo", company: "Associação", save: "Guardar contacto", viewBack: "Ver verso", viewFront: "Ver frente", scanHint: "Leia para guardar o contacto", pdf: "Guardar em PDF" },
  services: [
    { title: "Memorização do Alcorão", blurb: "Círculos de memorização do Alcorão e aprendizagem da recitação — o trabalho que deu origem à associação quando foi registada em 1977." },
    { title: "Apadrinhamento de órfãos", blurb: "Apadrinhar órfãos e acompanhar as suas famílias, de modo a proteger a sua dignidade e não fazer da ajuda um favor." },
    { title: "Creche", blurb: "Uma creche para as crianças da comunidade local, no âmbito do objetivo de melhorar a situação de mães e crianças." },
    { title: "A oficina", blurb: "Uma oficina que oferece trabalho e formação, em especial às mulheres — o valor de participação ativa posto em prática." },
    { title: "Projetos de serviço", blurb: "Projetos de serviço para a comunidade local, entre eles a sensibilização para as doenças, como parte do esforço de a impulsionar." },
    { title: "Crédito", blurb: "Crédito que ajuda uma família a iniciar algo de que possa viver, em vez de uma ajuda que termina quando a ajuda acaba." }
  ],
  why: { eyebrow: "Porquê esta associação", title: "Aquilo em que a associação assenta", items: [
    { title: "Registada desde 1977", blurb: "Uma associação comunitária registada com o n.º 224 de 1977 — quase cinquenta anos no mesmo lugar e para as mesmas pessoas." },
    { title: "Decisões transparentes", blurb: "Decisões tomadas com transparência, sem favorecer uma parte em detrimento de outra e no interesse comum — o seu primeiro valor declarado." },
    { title: "Decidido por consulta", blurb: "Consulta para que a responsabilidade seja realmente partilhada, em vez de decisões impostas e executadas por outros." },
    { title: "Participação das mulheres", blurb: "Participação ativa da comunidade local, com a das mulheres nomeada explicitamente entre os seus valores e levada à oficina." },
    { title: "A dignidade primeiro", blurb: "Elevar a pessoa e preservar a sua dignidade, como aquilo de que depende a vida de uma comunidade e não como cortesia." },
    { title: "Seis campos, uma associação", blurb: "Memorização, órfãos, creche, oficina, projetos de serviço e crédito — juntos, e não repartidos por organismos que nunca se encontram." }
  ] },
  operating: { eyebrow: "Como trabalhamos", title: "Cinco etapas, uma associação", items: [
    { title: "Contactar", blurb: "Uma visita ou uma chamada para o escritório principal em Sahel Selim." },
    { title: "Compreender a necessidade", blurb: "Ouvir a família e a comunidade local à sua volta." },
    { title: "Consultar", blurb: "A decisão é tomada por consulta, com transparência e sem favorecimentos." },
    { title: "Responder", blurb: "Memorização, apadrinhamento, lugar na creche, formação, um projeto ou um empréstimo." },
    { title: "Acompanhar", blurb: "Acompanhamento da família, porque a necessidade raramente acaba na primeira resposta." }
  ] },
  footer: { explore: "Explorar", getInTouch: "Contacto", founded: "Registada desde 1977 · Sahel Selim, Assiut, Egito", rights: "Todos os direitos reservados.", privacy: "Política de privacidade", terms: "Termos e condições", sitemap: "Mapa do site", digitalCard: "Cartão de contacto", developedBy: "Desenvolvido e detido por" }
};

const fr: Messages = {
  nav: { services: "Nos actions", projects: "Projets", media: "Espace presse", about: "À propos", contact: "Contact", careers: "Bénévolat" },
  cards: { eyebrow: "Contact", title: "Contacter l'association", subtitle: "Ouvrez la carte, puis scannez le QR code ou appuyez sur Enregistrer le contact pour nous ajouter à votre téléphone.", openCard: "Ouvrir la carte", roles: { founder: "Bureau principal", ops: "Administration", chairman: "Bureau principal" }, contact: "Contact", connect: "Se connecter", location: "Localisation", primaryMobile: "Mobile", secondaryMobile: "Fixe", company: "Association", save: "Enregistrer le contact", viewBack: "Voir le verso", viewFront: "Voir le recto", scanHint: "Scannez pour enregistrer le contact", pdf: "Enregistrer en PDF" },
  services: [
    { title: "Mémorisation du Coran", blurb: "Des cercles de mémorisation du Coran et d'apprentissage de la récitation — l'activité fondatrice de l'association lors de son enregistrement en 1977." },
    { title: "Parrainage d'orphelins", blurb: "Parrainer les orphelins et accompagner leurs familles, d'une manière qui protège leur dignité au lieu de faire de l'aide une faveur." },
    { title: "Crèche", blurb: "Une crèche pour les enfants de la communauté locale, au titre de l'objectif d'améliorer la situation des mères et des enfants." },
    { title: "L'atelier", blurb: "Un atelier offrant travail et formation, en particulier aux femmes — la valeur de participation active mise en pratique." },
    { title: "Projets de service", blurb: "Des projets de service pour la communauté locale, dont la sensibilisation aux maladies, dans le cadre de son progrès." },
    { title: "Prêts", blurb: "Des prêts qui aident un foyer à lancer une activité dont il puisse vivre, plutôt qu'une aide qui cesse quand l'aide cesse." }
  ],
  why: { eyebrow: "Pourquoi cette association", title: "Ce sur quoi l'association repose", items: [
    { title: "Enregistrée depuis 1977", blurb: "Une association communautaire enregistrée sous le n° 224 de 1977 — près de cinquante ans au même endroit, pour les mêmes personnes." },
    { title: "Des décisions transparentes", blurb: "Des décisions prises en toute transparence, sans favoriser une partie plutôt qu'une autre et dans l'intérêt commun — sa première valeur déclarée." },
    { title: "Décidé par la concertation", blurb: "La concertation pour que la responsabilité soit réellement partagée, plutôt que des décisions imposées et exécutées par d'autres." },
    { title: "Participation des femmes", blurb: "Une participation active de la communauté locale, celle des femmes étant nommée explicitement parmi ses valeurs et portée à l'atelier." },
    { title: "La dignité d'abord", blurb: "Élever la personne et préserver sa dignité, comme ce dont dépend la vie d'une communauté et non comme une politesse." },
    { title: "Six champs, une association", blurb: "Mémorisation, orphelins, crèche, atelier, projets de service et prêts — réunis, et non répartis entre des organismes qui ne se rencontrent jamais." }
  ] },
  operating: { eyebrow: "Comment nous travaillons", title: "Cinq étapes, une association", items: [
    { title: "Prendre contact", blurb: "Une visite ou un appel au bureau principal de Sahel Selim." },
    { title: "Comprendre le besoin", blurb: "Écouter le foyer et la communauté locale qui l'entoure." },
    { title: "Se concerter", blurb: "La décision est prise par concertation, en toute transparence et sans faveur." },
    { title: "Répondre", blurb: "Mémorisation, parrainage, place en crèche, formation, un projet ou un prêt." },
    { title: "Rester présents", blurb: "Un suivi auprès de la famille, car le besoin s'arrête rarement à la première réponse." }
  ] },
  footer: { explore: "Explorer", getInTouch: "Nous contacter", founded: "Enregistrée depuis 1977 · Sahel Selim, Assiout, Égypte", rights: "Tous droits réservés.", privacy: "Politique de confidentialité", terms: "Conditions générales", sitemap: "Plan du site", digitalCard: "Carte de contact", developedBy: "Développé et détenu par" }
};

const DICT: Record<Locale, Messages> = { en, ar, es, pt, fr };

export function getMessages(locale: Locale): Messages {
  return DICT[locale] ?? en;
}
