import type { Locale } from "./i18n";

export type PartnerMessages = {
  reseller: {
    back: string; title: string; subtitle: string; promoCode: string; copyCode: string;
    shareLink: string; copyLink: string; redemptions: string; conversions: string;
    revenue: string; commission: string; disclaimer: string;
  };
  api: {
    back: string; title: string; subtitle: string; policy: string; yourKeys: string;
    quickStart: string; authIntro: string; reportSale: string; idempotentNote: string;
    readRevenue: string; otherEndpoints: string; meDesc: string; solutionsDesc: string; footer: string;
  };
};

// {off}/{comm} = reseller discount / commission %, {a}/{b} = partner / Unskinned split %
// it omitted → falls back to English (getter uses ?? P.en); Italian is a follow-up.
const P: Partial<Record<Locale, PartnerMessages>> = {
  en: {
    reseller: {
      back: "← Dashboard", title: "Reseller program",
      subtitle: "Share your code — clients get {off}% off, and you earn {comm}% of attributed revenue.",
      promoCode: "Your promo code", copyCode: "Copy code", shareLink: "Your share link", copyLink: "Copy link",
      redemptions: "Redemptions", conversions: "Paid conversions", revenue: "Attributed revenue", commission: "Commission",
      disclaimer: "Commission is an estimate on completed transactions that used your code. Payouts are handled by Unskinned per your reseller agreement."
    },
    api: {
      back: "← Partner portal", title: "Integration API",
      subtitle: "Connect your SaaS to the Unskinned platform: report sales and read your revenue. Revenue is shared {a}/{b} per the",
      policy: "Partner Policy", yourKeys: "Your API keys", quickStart: "Quick start",
      authIntro: "Authenticate every request with your key:", reportSale: "Report a sale (50/50 split applied automatically)",
      idempotentNote: "externalId makes the call idempotent (safe to retry). Use amountCents instead of amount for integer minor units.",
      readRevenue: "Read your revenue", otherEndpoints: "Other endpoints",
      meDesc: "your partner account", solutionsDesc: "your listed solutions + their split",
      footer: "Keep your keys secret. Revoke a key any time — it stops working immediately. Unskinned is the Merchant of Record; your share accrues and is paid out per the Partner Policy."
    }
  },
  
  es: {
    reseller: {
      back: "← Panel", title: "Programa de resellers",
      subtitle: "Comparte tu código — los clientes obtienen {off}% de descuento y tú ganas {comm}% de los ingresos atribuidos.",
      promoCode: "Tu código promocional", copyCode: "Copiar código", shareLink: "Tu enlace para compartir", copyLink: "Copiar enlace",
      redemptions: "Canjes", conversions: "Conversiones pagadas", revenue: "Ingresos atribuidos", commission: "Comisión",
      disclaimer: "La comisión es una estimación sobre transacciones completadas que usaron tu código. Los pagos los gestiona Unskinned según tu acuerdo de reseller."
    },
    api: {
      back: "← Portal de partner", title: "API de integración",
      subtitle: "Conecta tu SaaS a la plataforma Unskinned: reporta ventas y consulta tus ingresos. Los ingresos se reparten {a}/{b} según la",
      policy: "Política de Partner", yourKeys: "Tus claves API", quickStart: "Inicio rápido",
      authIntro: "Autentica cada petición con tu clave:", reportSale: "Reportar una venta (reparto 50/50 automático)",
      idempotentNote: "externalId hace la llamada idempotente (seguro reintentar). Usa amountCents en vez de amount para unidades menores enteras.",
      readRevenue: "Consultar tus ingresos", otherEndpoints: "Otros endpoints",
      meDesc: "tu cuenta de partner", solutionsDesc: "tus soluciones y su reparto",
      footer: "Mantén tus claves en secreto. Revoca una clave cuando quieras — deja de funcionar al instante. Unskinned es el Comerciante Registrado; tu parte se acumula y se paga según la Política de Partner."
    }
  },
  ar: {
    reseller: {
      back: "← لوحة التحكم", title: "برنامج الموزّعين",
      subtitle: "شارك رمزك — يحصل العملاء على خصم {off}% وتكسب أنت {comm}% من الإيرادات المنسوبة.",
      promoCode: "رمزك الترويجي", copyCode: "نسخ الرمز", shareLink: "رابط المشاركة", copyLink: "نسخ الرابط",
      redemptions: "الاستخدامات", conversions: "تحويلات مدفوعة", revenue: "الإيرادات المنسوبة", commission: "العمولة",
      disclaimer: "العمولة تقدير على المعاملات المكتملة التي استخدمت رمزك. تتولى Unskinned المدفوعات وفق اتفاقية الموزّع."
    },
    api: {
      back: "← بوابة الشريك", title: "واجهة برمجة التكامل",
      subtitle: "اربط منتج SaaS الخاص بك بمنصة Unskinned: أبلغ عن المبيعات واطّلع على إيراداتك. تُقتسم الإيرادات {a}/{b} وفق",
      policy: "سياسة الشريك", yourKeys: "مفاتيح API الخاصة بك", quickStart: "البدء السريع",
      authIntro: "وثّق كل طلب باستخدام مفتاحك:", reportSale: "الإبلاغ عن عملية بيع (يُطبّق تقاسم 50/50 تلقائيًا)",
      idempotentNote: "externalId يجعل الطلب غير مكرر (آمن لإعادة المحاولة). استخدم amountCents بدل amount للوحدات الصغرى الصحيحة.",
      readRevenue: "اطّلع على إيراداتك", otherEndpoints: "نقاط نهاية أخرى",
      meDesc: "حساب الشريك الخاص بك", solutionsDesc: "حلولك ونسبة تقاسمها",
      footer: "حافظ على سرية مفاتيحك. ألغِ أي مفتاح في أي وقت — يتوقف فورًا. Unskinned هي التاجر المُسجّل؛ تتراكم حصتك وتُدفع وفق سياسة الشريك."
    }
  },
  fr: {
    reseller: {
      back: "← Tableau de bord", title: "Programme revendeur",
      subtitle: "Partagez votre code — les clients obtiennent {off}% de remise et vous gagnez {comm}% des revenus attribués.",
      promoCode: "Votre code promo", copyCode: "Copier le code", shareLink: "Votre lien de partage", copyLink: "Copier le lien",
      redemptions: "Utilisations", conversions: "Conversions payées", revenue: "Revenus attribués", commission: "Commission",
      disclaimer: "La commission est une estimation sur les transactions finalisées ayant utilisé votre code. Les paiements sont gérés par Unskinned selon votre accord revendeur."
    },
    api: {
      back: "← Portail partenaire", title: "API d'intégration",
      subtitle: "Connectez votre SaaS à la plateforme Unskinned : déclarez les ventes et consultez vos revenus. Les revenus sont partagés {a}/{b} selon la",
      policy: "Politique partenaire", yourKeys: "Vos clés API", quickStart: "Démarrage rapide",
      authIntro: "Authentifiez chaque requête avec votre clé :", reportSale: "Déclarer une vente (partage 50/50 automatique)",
      idempotentNote: "externalId rend l'appel idempotent (réessai sûr). Utilisez amountCents au lieu d'amount pour des unités mineures entières.",
      readRevenue: "Consulter vos revenus", otherEndpoints: "Autres endpoints",
      meDesc: "votre compte partenaire", solutionsDesc: "vos solutions et leur partage",
      footer: "Gardez vos clés secrètes. Révoquez une clé à tout moment — elle cesse de fonctionner immédiatement. Unskinned est le Marchand de Référence ; votre part s'accumule et est versée selon la Politique partenaire."
    }
  },
  
  pt: {
    reseller: {
      back: "← Painel", title: "Programa de revendedor",
      subtitle: "Compartilhe seu código — clientes recebem {off}% de desconto e você ganha {comm}% da receita atribuída.",
      promoCode: "Seu código promocional", copyCode: "Copiar código", shareLink: "Seu link de compartilhamento", copyLink: "Copiar link",
      redemptions: "Resgates", conversions: "Conversões pagas", revenue: "Receita atribuída", commission: "Comissão",
      disclaimer: "A comissão é uma estimativa sobre transações concluídas que usaram seu código. Os pagamentos são feitos pela Unskinned conforme seu acordo de revendedor."
    },
    api: {
      back: "← Portal do parceiro", title: "API de integração",
      subtitle: "Conecte seu SaaS à plataforma Unskinned: reporte vendas e consulte sua receita. A receita é dividida {a}/{b} conforme a",
      policy: "Política do Parceiro", yourKeys: "Suas chaves de API", quickStart: "Início rápido",
      authIntro: "Autentique cada requisição com sua chave:", reportSale: "Reportar uma venda (divisão 50/50 automática)",
      idempotentNote: "externalId torna a chamada idempotente (seguro repetir). Use amountCents em vez de amount para unidades menores inteiras.",
      readRevenue: "Consultar sua receita", otherEndpoints: "Outros endpoints",
      meDesc: "sua conta de parceiro", solutionsDesc: "suas soluções e sua divisão",
      footer: "Mantenha suas chaves em segredo. Revogue uma chave a qualquer momento — ela para de funcionar imediatamente. A Unskinned é o Comerciante Registrado; sua parte acumula e é paga conforme a Política do Parceiro."
    }
  }

  
  
};

export function getPartnerMessages(locale: Locale): PartnerMessages {
  return P[locale] ?? P.en!;
}
