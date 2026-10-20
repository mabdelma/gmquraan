import type { Locale } from "./i18n";

/** App-surface strings (marketplace, dashboard, partner, admin) in all 10 locales. */
export interface AppMessages {
  categories: Record<string, string>;
  licenses: Record<string, string>;
  market: { title: string; subtitle: string; searchPh: string; search: string; all: string; empty: string; emptyCta: string; featured: string; live: string };
  detail: { back: string; license: string; region: string; whiteLabel: string; yes: string; no: string; vendor: string; visit: string; requestDemo: string; requesting: string; demoDone: string; ask: string; techStack: string; reviews: string; noReviews: string; leaveReview: string; reviewTitlePh: string; reviewBodyPh: string; submitReview: string; reviewThanks: string; related: string; contactPricing: string };
  dash: { welcome: string; browse: string; partnerPortal: string; saved: string; savedEmpty: string; demos: string; demosEmpty: string };
  partner: { title: string; leadsCrm: string; newSolution: string; published: string; leads: string; demoRequests: string; yourSolutions: string; empty: string; emptyCta: string; draft: string; pub: string };
  partnerNew: { title: string; subtitle: string; titleField: string; summary: string; description: string; price: string; vendor: string; tags: string; techStack: string; whiteLabel: string; publish: string; publishing: string };
  partnerLeads: { title: string; subtitle: string; empty: string; lead: string; solution: string; message: string; status: string };
  admin: { title: string; reviewModeration: string; users: string; partners: string; solutions: string; leads: string; createCoupon: string; recentLeads: string };
}

const CATS = ["SAAS_PLATFORM", "LAUNCH_KIT", "AI_AUTOMATION", "PRODUCTIZED_SERVICE", "MARKETPLACE_SOLUTION", "MARKET_ENABLEMENT"] as const;
const cat = (v: string[]) => Object.fromEntries(CATS.map((k, i) => [k, v[i]]));
const lic = (a: string, b: string, c: string) => ({ SUBSCRIPTION: a, ONE_TIME: b, REVENUE_SHARE: c });

const en: AppMessages = {
  categories: cat(["White-Label SaaS", "Launch Kit", "AI & Automation", "Productized Service", "Marketplace Solution", "Market Enablement"]),
  licenses: lic("Subscription", "One-time", "Revenue share"),
  market: { title: "Ready-to-deploy digital solutions", subtitle: "Vetted, productized solutions you can launch across the GCC and Europe.", searchPh: "Search solutions, tags, vendors…", search: "Search", all: "All", empty: "No solutions match your search yet.", emptyCta: "tell us what you need", featured: "Featured", live: "Live" },
  detail: { back: "Back to marketplace", license: "License", region: "Region", whiteLabel: "White-label", yes: "Yes", no: "No", vendor: "Vendor", visit: "Visit product ↗", requestDemo: "Request a demo", requesting: "Requesting…", demoDone: "Demo requested — we'll be in touch.", ask: "Ask a question", techStack: "Tech stack", reviews: "Reviews", noReviews: "No reviews yet — be the first.", leaveReview: "Leave a review", reviewTitlePh: "Title (optional)", reviewBodyPh: "Share your experience…", submitReview: "Submit review", reviewThanks: "Thanks for your review!", related: "Related solutions", contactPricing: "Contact for pricing" },
  dash: { welcome: "Welcome", browse: "Browse marketplace", partnerPortal: "Partner portal", saved: "Saved solutions", savedEmpty: "Nothing saved yet.", demos: "Demo requests", demosEmpty: "No demo requests yet." },
  partner: { title: "Partner portal", leadsCrm: "Leads / CRM", newSolution: "New solution", published: "Published solutions", leads: "Leads", demoRequests: "Demo requests", yourSolutions: "Your solutions", empty: "You haven't published any solutions yet.", emptyCta: "Create your first", draft: "Draft", pub: "Published" },
  partnerNew: { title: "Publish a solution", subtitle: "List a ready-to-deploy solution on the Unskinned marketplace.", titleField: "Title", summary: "Short summary (one line)", description: "Full description", price: "Price (0 = contact)", vendor: "Vendor / brand name", tags: "Tags (comma separated)", techStack: "Tech stack (comma separated)", whiteLabel: "Available as white-label", publish: "Publish solution", publishing: "Publishing…" },
  partnerLeads: { title: "Leads & CRM pipeline", subtitle: "leads from demo requests and contact forms.", empty: "No leads yet.", lead: "Lead", solution: "Solution", message: "Message", status: "Status" },
  admin: { title: "Central admin", reviewModeration: "Review moderation", users: "Users", partners: "Partners", solutions: "Solutions", leads: "Leads", createCoupon: "Create a coupon", recentLeads: "Recent leads" }
};

const es: AppMessages = {
  categories: cat(["SaaS marca blanca", "Kit de lanzamiento", "IA y automatización", "Servicio productizado", "Solución de mercado", "Habilitación de mercado"]),
  licenses: lic("Suscripción", "Pago único", "Reparto de ingresos"),
  market: { title: "Soluciones digitales listas para desplegar", subtitle: "Soluciones verificadas y productizadas para lanzar en el CCG y Europa.", searchPh: "Buscar soluciones, etiquetas, proveedores…", search: "Buscar", all: "Todas", empty: "Ninguna solución coincide con tu búsqueda todavía.", emptyCta: "cuéntanos qué necesitas", featured: "Destacado", live: "En vivo" },
  detail: { back: "Volver al mercado", license: "Licencia", region: "Región", whiteLabel: "Marca blanca", yes: "Sí", no: "No", vendor: "Proveedor", visit: "Visitar producto ↗", requestDemo: "Solicitar demo", requesting: "Solicitando…", demoDone: "Demo solicitada — te contactaremos.", ask: "Hacer una pregunta", techStack: "Tecnologías", reviews: "Reseñas", noReviews: "Aún no hay reseñas — sé el primero.", leaveReview: "Deja una reseña", reviewTitlePh: "Título (opcional)", reviewBodyPh: "Comparte tu experiencia…", submitReview: "Enviar reseña", reviewThanks: "¡Gracias por tu reseña!", related: "Soluciones relacionadas", contactPricing: "Consultar precio" },
  dash: { welcome: "Bienvenido", browse: "Explorar el mercado", partnerPortal: "Portal de socios", saved: "Soluciones guardadas", savedEmpty: "Aún no has guardado nada.", demos: "Solicitudes de demo", demosEmpty: "Aún no hay solicitudes de demo." },
  partner: { title: "Portal de socios", leadsCrm: "Leads / CRM", newSolution: "Nueva solución", published: "Soluciones publicadas", leads: "Leads", demoRequests: "Solicitudes de demo", yourSolutions: "Tus soluciones", empty: "Aún no has publicado ninguna solución.", emptyCta: "Crea la primera", draft: "Borrador", pub: "Publicada" },
  partnerNew: { title: "Publicar una solución", subtitle: "Publica una solución lista para desplegar en el mercado de Unskinned.", titleField: "Título", summary: "Resumen breve (una línea)", description: "Descripción completa", price: "Precio (0 = consultar)", vendor: "Nombre de marca / proveedor", tags: "Etiquetas (separadas por comas)", techStack: "Tecnologías (separadas por comas)", whiteLabel: "Disponible como marca blanca", publish: "Publicar solución", publishing: "Publicando…" },
  partnerLeads: { title: "Leads y pipeline CRM", subtitle: "leads de solicitudes de demo, formularios y el asesor.", empty: "Aún no hay leads.", lead: "Lead", solution: "Solución", message: "Mensaje", status: "Estado" },
  admin: { title: "Administración central", reviewModeration: "Moderación de reseñas", users: "Usuarios", partners: "Socios", solutions: "Soluciones", leads: "Leads", createCoupon: "Crear un cupón", recentLeads: "Leads recientes" }
};

const ar: AppMessages = {
  categories: cat(["SaaS بعلامة بيضاء", "حزمة إطلاق", "ذكاء اصطناعي وأتمتة", "خدمة مُنتَجة", "حل سوق", "تمكين السوق"]),
  licenses: lic("اشتراك", "دفعة واحدة", "حصة من الإيرادات"),
  market: { title: "حلول رقمية جاهزة للنشر", subtitle: "حلول موثوقة ومُنتَجة لإطلاقها عبر الخليج وأوروبا.", searchPh: "ابحث عن حلول، وسوم، موردين…", search: "بحث", all: "الكل", empty: "لا توجد حلول تطابق بحثك بعد.", emptyCta: "أخبرنا بما تحتاجه", featured: "مميّز", live: "مباشر" },
  detail: { back: "العودة إلى المتجر", license: "الترخيص", region: "المنطقة", whiteLabel: "علامة بيضاء", yes: "نعم", no: "لا", vendor: "المورّد", visit: "زيارة المنتج ↗", requestDemo: "طلب عرض توضيحي", requesting: "جارٍ الطلب…", demoDone: "تم طلب العرض — سنتواصل معك.", ask: "اطرح سؤالاً", techStack: "التقنيات", reviews: "التقييمات", noReviews: "لا توجد تقييمات بعد — كن الأول.", leaveReview: "اترك تقييمًا", reviewTitlePh: "العنوان (اختياري)", reviewBodyPh: "شارك تجربتك…", submitReview: "إرسال التقييم", reviewThanks: "شكرًا على تقييمك!", related: "حلول ذات صلة", contactPricing: "تواصل لمعرفة السعر" },
  dash: { welcome: "مرحبًا", browse: "تصفّح المتجر", partnerPortal: "بوابة الشركاء", saved: "الحلول المحفوظة", savedEmpty: "لم تحفظ شيئًا بعد.", demos: "طلبات العروض", demosEmpty: "لا توجد طلبات عروض بعد." },
  partner: { title: "بوابة الشركاء", leadsCrm: "العملاء المحتملون / CRM", newSolution: "حل جديد", published: "حلول منشورة", leads: "عملاء محتملون", demoRequests: "طلبات العروض", yourSolutions: "حلولك", empty: "لم تنشر أي حلول بعد.", emptyCta: "أنشئ حلّك الأول", draft: "مسودة", pub: "منشور" },
  partnerNew: { title: "نشر حل", subtitle: "اعرض حلاً جاهزًا للنشر في سوق Unskinned.", titleField: "العنوان", summary: "ملخص قصير (سطر واحد)", description: "الوصف الكامل", price: "السعر (0 = تواصل)", vendor: "اسم العلامة / المورّد", tags: "وسوم (مفصولة بفواصل)", techStack: "التقنيات (مفصولة بفواصل)", whiteLabel: "متاح بعلامة بيضاء", publish: "نشر الحل", publishing: "جارٍ النشر…" },
  partnerLeads: { title: "العملاء المحتملون وخط CRM", subtitle: "عملاء من طلبات العروض والنماذج والمستشار.", empty: "لا يوجد عملاء بعد.", lead: "عميل محتمل", solution: "الحل", message: "الرسالة", status: "الحالة" },
  admin: { title: "الإدارة المركزية", reviewModeration: "إدارة التقييمات", users: "المستخدمون", partners: "الشركاء", solutions: "الحلول", leads: "العملاء المحتملون", createCoupon: "إنشاء قسيمة", recentLeads: "أحدث العملاء" }
};

const fr: AppMessages = {
  categories: cat(["SaaS marque blanche", "Kit de lancement", "IA & automatisation", "Service productisé", "Solution de place de marché", "Activation de marché"]),
  licenses: lic("Abonnement", "Paiement unique", "Partage de revenus"),
  market: { title: "Solutions numériques prêtes à déployer", subtitle: "Des solutions vérifiées et productisées à lancer dans le CCG et en Europe.", searchPh: "Rechercher solutions, tags, fournisseurs…", search: "Rechercher", all: "Toutes", empty: "Aucune solution ne correspond à votre recherche.", emptyCta: "dites-nous ce qu'il vous faut", featured: "À la une", live: "En ligne" },
  detail: { back: "Retour à la place de marché", license: "Licence", region: "Région", whiteLabel: "Marque blanche", yes: "Oui", no: "Non", vendor: "Fournisseur", visit: "Voir le produit ↗", requestDemo: "Demander une démo", requesting: "Envoi…", demoDone: "Démo demandée — nous vous contacterons.", ask: "Poser une question", techStack: "Technologies", reviews: "Avis", noReviews: "Aucun avis pour l'instant — soyez le premier.", leaveReview: "Laisser un avis", reviewTitlePh: "Titre (facultatif)", reviewBodyPh: "Partagez votre expérience…", submitReview: "Envoyer l'avis", reviewThanks: "Merci pour votre avis !", related: "Solutions associées", contactPricing: "Prix sur demande" },
  dash: { welcome: "Bienvenue", browse: "Explorer la place de marché", partnerPortal: "Portail partenaire", saved: "Solutions enregistrées", savedEmpty: "Rien d'enregistré pour l'instant.", demos: "Demandes de démo", demosEmpty: "Aucune demande de démo." },
  partner: { title: "Portail partenaire", leadsCrm: "Leads / CRM", newSolution: "Nouvelle solution", published: "Solutions publiées", leads: "Leads", demoRequests: "Demandes de démo", yourSolutions: "Vos solutions", empty: "Vous n'avez encore publié aucune solution.", emptyCta: "Créez la première", draft: "Brouillon", pub: "Publiée" },
  partnerNew: { title: "Publier une solution", subtitle: "Référencez une solution prête à déployer sur la place de marché Unskinned.", titleField: "Titre", summary: "Résumé court (une ligne)", description: "Description complète", price: "Prix (0 = contact)", vendor: "Nom de marque / fournisseur", tags: "Tags (séparés par des virgules)", techStack: "Technologies (séparées par des virgules)", whiteLabel: "Disponible en marque blanche", publish: "Publier la solution", publishing: "Publication…" },
  partnerLeads: { title: "Leads & pipeline CRM", subtitle: "leads issus des demandes de démo, formulaires et de l'assistant.", empty: "Aucun lead pour l'instant.", lead: "Lead", solution: "Solution", message: "Message", status: "Statut" },
  admin: { title: "Administration centrale", reviewModeration: "Modération des avis", users: "Utilisateurs", partners: "Partenaires", solutions: "Solutions", leads: "Leads", createCoupon: "Créer un coupon", recentLeads: "Leads récents" }
};

const pt: AppMessages = {
  categories: cat(["SaaS white-label", "Kit de lançamento", "IA e automação", "Serviço produtizado", "Solução de marketplace", "Habilitação de mercado"]),
  licenses: lic("Assinatura", "Pagamento único", "Participação na receita"),
  market: { title: "Soluções digitais prontas para implantar", subtitle: "Soluções verificadas e produtizadas para lançar no CCG e na Europa.", searchPh: "Buscar soluções, tags, fornecedores…", search: "Buscar", all: "Todas", empty: "Nenhuma solução corresponde à sua busca ainda.", emptyCta: "conte-nos o que você precisa", featured: "Destaque", live: "Ao vivo" },
  detail: { back: "Voltar ao marketplace", license: "Licença", region: "Região", whiteLabel: "White-label", yes: "Sim", no: "Não", vendor: "Fornecedor", visit: "Visitar produto ↗", requestDemo: "Solicitar demo", requesting: "Solicitando…", demoDone: "Demo solicitada — entraremos em contato.", ask: "Fazer uma pergunta", techStack: "Tecnologias", reviews: "Avaliações", noReviews: "Ainda sem avaliações — seja o primeiro.", leaveReview: "Deixe uma avaliação", reviewTitlePh: "Título (opcional)", reviewBodyPh: "Compartilhe sua experiência…", submitReview: "Enviar avaliação", reviewThanks: "Obrigado pela avaliação!", related: "Soluções relacionadas", contactPricing: "Consultar preço" },
  dash: { welcome: "Bem-vindo", browse: "Explorar marketplace", partnerPortal: "Portal de parceiros", saved: "Soluções salvas", savedEmpty: "Nada salvo ainda.", demos: "Solicitações de demo", demosEmpty: "Ainda sem solicitações de demo." },
  partner: { title: "Portal de parceiros", leadsCrm: "Leads / CRM", newSolution: "Nova solução", published: "Soluções publicadas", leads: "Leads", demoRequests: "Solicitações de demo", yourSolutions: "Suas soluções", empty: "Você ainda não publicou nenhuma solução.", emptyCta: "Crie a primeira", draft: "Rascunho", pub: "Publicada" },
  partnerNew: { title: "Publicar uma solução", subtitle: "Liste uma solução pronta para implantar no marketplace da Unskinned.", titleField: "Título", summary: "Resumo curto (uma linha)", description: "Descrição completa", price: "Preço (0 = contato)", vendor: "Nome de marca / fornecedor", tags: "Tags (separadas por vírgula)", techStack: "Tecnologias (separadas por vírgula)", whiteLabel: "Disponível como white-label", publish: "Publicar solução", publishing: "Publicando…" },
  partnerLeads: { title: "Leads e pipeline de CRM", subtitle: "leads de solicitações de demo, formulários e o assessor.", empty: "Ainda sem leads.", lead: "Lead", solution: "Solução", message: "Mensagem", status: "Status" },
  admin: { title: "Administração central", reviewModeration: "Moderação de avaliações", users: "Usuários", partners: "Parceiros", solutions: "Soluções", leads: "Leads", createCoupon: "Criar um cupom", recentLeads: "Leads recentes" }
};

const DICTS: Record<Locale, AppMessages> = { en, es, fr, ar, pt };

export function getAppMessages(locale: Locale): AppMessages {
  return DICTS[locale] ?? en;
}
