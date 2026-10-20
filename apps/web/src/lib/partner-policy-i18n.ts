import type { Locale } from "./i18n";

export type PolicySection = { h: string; p: string };
export type PolicyContent = {
  eyebrow: string;
  title: string;
  effective: string;
  splitPlatform: string;
  splitPartner: string;
  sections: PolicySection[];
  acceptHint: string;
  canonical: string;
};

const EFFECTIVE = "June 20, 2026";

// Faithful, condensed localization of the Partner Policy & Agreement. English is the
// canonical legal reference; other languages summarize the same terms.
// it omitted → falls back to English (consumer uses ?? POLICY_I18N.en); legal copy is a follow-up.
export const POLICY_I18N: Partial<Record<Locale, PolicyContent>> = {
  en: {
    eyebrow: "SaaS Partnership Hub",
    title: "Partner Policy & Agreement",
    effective: `Official Partnership Framework · Effective ${EFFECTIVE}`,
    splitPlatform: "Unskinned",
    splitPartner: "Partner (You)",
    canonical: "This English text is the canonical version of the agreement.",
    acceptHint: "By creating a partner account you agree to these terms.",
    sections: [
      { h: "1. Purpose", p: "This policy governs the partnership between Unskinned and its registered technology partners. Unskinned is a deployment, marketing, and sales platform for SaaS products built by independent partners." },
      { h: "2. The Partnership Model", p: "The Partner builds and maintains the product (code, updates, documentation, technical support). Unskinned provides hosting infrastructure, SSL/domains, marketing, the sales pipeline, customer onboarding, billing, first-level support, and monthly reporting." },
      { h: "3. Revenue Split", p: "All revenue from sales of the Partner's product through the platform is shared per the agreed split (standard 50% to Unskinned, 50% to the Partner). Partners pay no subscription or platform tier — subscription tiers apply to client accounts only; partners and resellers earn through revenue share and commission respectively." },
      { h: "4. Onboarding", p: "Create a partner account, submit your product and docs, pass review (up to 5 business days), get deployed, receive a live dashboard, and the first marketing campaign launches within 14 days." },
      { h: "5. Payment Terms", p: "Revenue is net of processor fees, refunds, and chargebacks, reconciled monthly and paid within 15 business days of month-end. A $50 minimum payout applies; smaller balances roll over." },
      { h: "6. Responsibilities", p: "The Partner maintains quality, security, SLAs, lawful IP, and accurate information. Unskinned maintains 99.5% uptime, security, marketing, billing, dashboards, and timely payouts." },
      { h: "7. Intellectual Property", p: "The Partner owns their product and IP. Unskinned owns its marketing, brand, platform, and platform-collected customer data. The Partner grants Unskinned a non-exclusive licence to host, market, and sell the product." },
      { h: "8. Term & Termination", p: "The partnership runs indefinitely; the Partner may exit on 30 days' notice. Unskinned may terminate for material breach, IP infringement, or fraud. Outstanding revenue is paid within 30 days of termination." },
      { h: "9. Exclusivity", p: "Unskinned has the exclusive right to sell the product to customers it acquires. Partners keep full rights to customers from their own channels. Exclusivity lasts the partnership plus 12 months for customers acquired during it." },
      { h: "10. Commercial Umbrella", p: "Partners (companies or individuals) operate under Unskinned as Merchant of Record — no separate vendor licences or payment accounts needed. Unskinned handles invoicing, tax, refunds, and PCI-DSS compliance." }
    ]
  },
  
  es: {
    eyebrow: "Hub de Partners SaaS",
    title: "Política y Acuerdo de Partner",
    effective: `Marco Oficial de Asociación · Vigente desde ${EFFECTIVE}`,
    splitPlatform: "Unskinned",
    splitPartner: "Partner (Tú)",
    canonical: "El texto en inglés es la versión canónica del acuerdo.",
    acceptHint: "Al crear una cuenta de partner aceptas estos términos.",
    sections: [
      { h: "1. Propósito", p: "Esta política rige la asociación entre Unskinned y sus partners tecnológicos registrados. Unskinned es una plataforma de despliegue, marketing y ventas para productos SaaS creados por partners independientes." },
      { h: "2. Modelo de Asociación", p: "El Partner crea y mantiene el producto (código, actualizaciones, documentación, soporte técnico). Unskinned aporta infraestructura, SSL/dominios, marketing, ventas, alta de clientes, facturación, soporte de primer nivel e informes mensuales." },
      { h: "3. Reparto de Ingresos", p: "Todos los ingresos por ventas del producto a través de la plataforma se reparten al 50%: 50% para Unskinned y 50% para el Partner." },
      { h: "4. Incorporación", p: "Crea una cuenta, envía tu producto y documentación, supera la revisión (hasta 5 días hábiles), se despliega, recibes un panel en vivo y la primera campaña se lanza en 14 días." },
      { h: "5. Pagos", p: "Los ingresos son netos de comisiones, reembolsos y contracargos, se concilian mensualmente y se pagan en 15 días hábiles tras el cierre. Pago mínimo de 50 $; los saldos menores se acumulan." },
      { h: "6. Responsabilidades", p: "El Partner mantiene calidad, seguridad, SLAs, IP lícita e información precisa. Unskinned mantiene 99,5% de disponibilidad, seguridad, marketing, facturación, paneles y pagos puntuales." },
      { h: "7. Propiedad Intelectual", p: "El Partner es dueño de su producto e IP. Unskinned posee su marketing, marca, plataforma y datos de clientes recogidos en ella. El Partner concede a Unskinned una licencia no exclusiva para alojar, comercializar y vender el producto." },
      { h: "8. Vigencia y Terminación", p: "La asociación es indefinida; el Partner puede salir con 30 días de aviso. Unskinned puede terminar por incumplimiento grave, infracción de IP o fraude. Los ingresos pendientes se pagan en 30 días." },
      { h: "9. Exclusividad", p: "Unskinned tiene el derecho exclusivo de vender el producto a los clientes que capta. El Partner conserva sus propios clientes. La exclusividad dura la asociación más 12 meses para clientes captados durante ella." },
      { h: "10. Paraguas Comercial", p: "Los partners (empresas o individuos) operan bajo Unskinned como Comerciante Registrado — sin licencias ni cuentas de pago propias. Unskinned gestiona facturación, impuestos, reembolsos y cumplimiento PCI-DSS." }
    ]
  },
  ar: {
    eyebrow: "مركز شراكات SaaS",
    title: "سياسة واتفاقية الشريك",
    effective: `إطار الشراكة الرسمي · سارٍ من ${EFFECTIVE}`,
    splitPlatform: "Unskinned",
    splitPartner: "الشريك (أنت)",
    canonical: "النص الإنجليزي هو النسخة المرجعية للاتفاقية.",
    acceptHint: "بإنشاء حساب شريك فإنك توافق على هذه الشروط.",
    sections: [
      { h: "١. الغرض", p: "تحكم هذه السياسة الشراكة بين Unskinned وشركائها التقنيين المسجّلين. Unskinned منصة نشر وتسويق ومبيعات لمنتجات SaaS التي يبنيها شركاء مستقلون." },
      { h: "٢. نموذج الشراكة", p: "يبني الشريك المنتج ويصونه (الكود، التحديثات، التوثيق، الدعم التقني). توفّر Unskinned البنية التحتية وSSL/النطاقات والتسويق والمبيعات وإعداد العملاء والفوترة والدعم الأولي والتقارير الشهرية." },
      { h: "٣. تقاسم الإيرادات", p: "تُقتسم جميع إيرادات بيع المنتج عبر المنصة بالتساوي: 50% لـ Unskinned و50% للشريك." },
      { h: "٤. الانضمام", p: "أنشئ حساب شريك، قدّم منتجك ووثائقه، اجتز المراجعة (حتى 5 أيام عمل)، يتم النشر، تحصل على لوحة مباشرة، وتُطلق أول حملة تسويقية خلال 14 يومًا." },
      { h: "٥. شروط الدفع", p: "الإيرادات صافية بعد رسوم المعالجة والاستردادات، تُسوّى شهريًا وتُدفع خلال 15 يوم عمل بعد نهاية الشهر. حد أدنى للدفع 50 دولارًا؛ تُرحّل المبالغ الأقل." },
      { h: "٦. المسؤوليات", p: "يحافظ الشريك على الجودة والأمان واتفاقيات الخدمة والملكية المشروعة ودقة المعلومات. تحافظ Unskinned على جاهزية 99.5% والأمان والتسويق والفوترة واللوحات والدفعات في موعدها." },
      { h: "٧. الملكية الفكرية", p: "يملك الشريك منتجه وملكيته الفكرية. تملك Unskinned تسويقها وعلامتها ومنصتها وبيانات العملاء المجمّعة عبرها. يمنح الشريك Unskinned ترخيصًا غير حصري للاستضافة والتسويق والبيع." },
      { h: "٨. المدة والإنهاء", p: "الشراكة غير محددة المدة؛ يمكن للشريك الخروج بإشعار 30 يومًا. يحق لـ Unskinned الإنهاء عند الإخلال الجوهري أو انتهاك الملكية الفكرية أو الاحتيال. تُدفع الإيرادات المستحقة خلال 30 يومًا." },
      { h: "٩. الحصرية", p: "تملك Unskinned الحق الحصري في بيع المنتج للعملاء الذين تجلبهم. يحتفظ الشريك بعملائه من قنواته الخاصة. تستمر الحصرية طوال الشراكة و12 شهرًا بعدها للعملاء المكتسبين خلالها." },
      { h: "١٠. المظلة التجارية", p: "يعمل الشركاء (شركات أو أفراد) تحت Unskinned كتاجر مُسجّل — دون حاجة لتراخيص بائع أو حسابات دفع خاصة. تتولى Unskinned الفوترة والضرائب والاستردادات والامتثال لـ PCI-DSS." }
    ]
  },
  fr: {
    eyebrow: "Hub de Partenariat SaaS",
    title: "Politique et Accord de Partenaire",
    effective: `Cadre Officiel de Partenariat · En vigueur le ${EFFECTIVE}`,
    splitPlatform: "Unskinned",
    splitPartner: "Partenaire (Vous)",
    canonical: "Le texte anglais est la version de référence de l'accord.",
    acceptHint: "En créant un compte partenaire, vous acceptez ces conditions.",
    sections: [
      { h: "1. Objet", p: "Cette politique régit le partenariat entre Unskinned et ses partenaires technologiques enregistrés. Unskinned est une plateforme de déploiement, de marketing et de vente pour des produits SaaS créés par des partenaires indépendants." },
      { h: "2. Modèle de Partenariat", p: "Le Partenaire crée et maintient le produit (code, mises à jour, documentation, support technique). Unskinned fournit l'infrastructure, SSL/domaines, marketing, ventes, onboarding client, facturation, support de premier niveau et rapports mensuels." },
      { h: "3. Partage des Revenus", p: "Tous les revenus issus des ventes du produit via la plateforme sont partagés à parts égales : 50% pour Unskinned, 50% pour le Partenaire." },
      { h: "4. Intégration", p: "Créez un compte, soumettez votre produit et sa documentation, passez la revue (jusqu'à 5 jours ouvrés), soyez déployé, recevez un tableau de bord et la première campagne démarre sous 14 jours." },
      { h: "5. Conditions de Paiement", p: "Les revenus sont nets de frais, remboursements et impayés, rapprochés chaque mois et payés sous 15 jours ouvrés après la clôture. Seuil de paiement de 50 $ ; les soldes inférieurs sont reportés." },
      { h: "6. Responsabilités", p: "Le Partenaire assure qualité, sécurité, SLA, IP licite et informations exactes. Unskinned assure 99,5% de disponibilité, sécurité, marketing, facturation, tableaux de bord et paiements à temps." },
      { h: "7. Propriété Intellectuelle", p: "Le Partenaire possède son produit et son IP. Unskinned possède son marketing, sa marque, sa plateforme et les données clients collectées. Le Partenaire accorde à Unskinned une licence non exclusive pour héberger, promouvoir et vendre le produit." },
      { h: "8. Durée et Résiliation", p: "Le partenariat est à durée indéterminée ; le Partenaire peut partir avec un préavis de 30 jours. Unskinned peut résilier en cas de manquement grave, d'atteinte à l'IP ou de fraude. Les revenus dus sont payés sous 30 jours." },
      { h: "9. Exclusivité", p: "Unskinned détient le droit exclusif de vendre le produit aux clients qu'elle acquiert. Le Partenaire garde ses propres clients. L'exclusivité dure le partenariat plus 12 mois pour les clients acquis pendant celui-ci." },
      { h: "10. Cadre Commercial", p: "Les partenaires (sociétés ou particuliers) opèrent sous Unskinned en tant que Marchand de Référence — sans licences vendeur ni comptes de paiement propres. Unskinned gère facturation, taxes, remboursements et conformité PCI-DSS." }
    ]
  },
  
  pt: {
    eyebrow: "Hub de Parceria SaaS",
    title: "Política e Acordo de Parceiro",
    effective: `Estrutura Oficial de Parceria · Em vigor a partir de ${EFFECTIVE}`,
    splitPlatform: "Unskinned",
    splitPartner: "Parceiro (Você)",
    canonical: "O texto em inglês é a versão canônica do acordo.",
    acceptHint: "Ao criar uma conta de parceiro, você aceita estes termos.",
    sections: [
      { h: "1. Objetivo", p: "Esta política rege a parceria entre a Unskinned e seus parceiros de tecnologia registrados. A Unskinned é uma plataforma de implantação, marketing e vendas para produtos SaaS criados por parceiros independentes." },
      { h: "2. Modelo de Parceria", p: "O Parceiro cria e mantém o produto (código, atualizações, documentação, suporte técnico). A Unskinned fornece infraestrutura, SSL/domínios, marketing, vendas, onboarding de clientes, faturamento, suporte de primeiro nível e relatórios mensais." },
      { h: "3. Divisão de Receita", p: "Toda a receita das vendas do produto pela plataforma é dividida igualmente: 50% para a Unskinned, 50% para o Parceiro." },
      { h: "4. Integração", p: "Crie uma conta, envie seu produto e documentação, passe na revisão (até 5 dias úteis), seja implantado, receba um painel ao vivo e a primeira campanha começa em 14 dias." },
      { h: "5. Pagamento", p: "A receita é líquida de taxas, reembolsos e estornos, conciliada mensalmente e paga em 15 dias úteis após o fechamento. Pagamento mínimo de US$ 50; saldos menores acumulam." },
      { h: "6. Responsabilidades", p: "O Parceiro mantém qualidade, segurança, SLAs, PI lícita e informações precisas. A Unskinned mantém 99,5% de disponibilidade, segurança, marketing, faturamento, painéis e pagamentos pontuais." },
      { h: "7. Propriedade Intelectual", p: "O Parceiro é dono do seu produto e PI. A Unskinned detém seu marketing, marca, plataforma e os dados de clientes coletados nela. O Parceiro concede à Unskinned licença não exclusiva para hospedar, divulgar e vender." },
      { h: "8. Vigência e Rescisão", p: "A parceria é por prazo indeterminado; o Parceiro pode sair com aviso de 30 dias. A Unskinned pode rescindir por violação grave, infração de PI ou fraude. A receita devida é paga em 30 dias." },
      { h: "9. Exclusividade", p: "A Unskinned tem o direito exclusivo de vender o produto aos clientes que ela capta. O Parceiro mantém seus próprios clientes. A exclusividade dura a parceria mais 12 meses para clientes captados nela." },
      { h: "10. Guarda-chuva Comercial", p: "Parceiros (empresas ou indivíduos) operam sob a Unskinned como Comerciante Registrado — sem licenças ou contas de pagamento próprias. A Unskinned cuida de faturamento, impostos, reembolsos e conformidade PCI-DSS." }
    ]
  }

  
  
};
