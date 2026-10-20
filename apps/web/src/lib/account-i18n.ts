import type { Locale } from "./i18n";

export type AccountMessages = {
  badge: Record<string, string>; // role -> short badge
  desc: Record<string, string>; // role -> one-line description
  browse: string;
  partnerPortal: string;
  newSolution: string;
  integrationApi: string;
  resellerDash: string;
  centralConsole: string;
  signOut: string;
  marketplace: string;
  live: string;
  pending: string;
  messages: string;
  agreements: string;
};

const R = (client: string, partner: string, reseller: string, admin: string, superadmin: string) => ({
  CLIENT: client,
  PARTNER: partner,
  RESELLER: reseller,
  ADMIN: admin,
  SUPER_ADMIN: superadmin
});

const M: Record<Locale, AccountMessages> = {
  en: {
    badge: R("Client account", "Partner account", "Reseller account", "Administrator", "Super-admin"),
    desc: R(
      "Discover, save, and request demos of digital solutions across the marketplace.",
      "List your SaaS on the marketplace, manage leads, and earn a 50/50 revenue share.",
      "Promote solutions with your unique referral code and earn commission on every sale.",
      "Manage the platform — users, solutions, revenue, payouts, and more.",
      "Full platform control: users & admins, revenue, payouts, audit log, and configuration."
    ),
    browse: "Browse solutions", partnerPortal: "Partner portal", newSolution: "New solution",
    integrationApi: "Integration API", resellerDash: "Open reseller dashboard", centralConsole: "Central console",
    signOut: "Sign out", marketplace: "Marketplace", live: "Live", pending: "Pending review", messages: "Messages", agreements: "Agreements"
  },
  es: {
    badge: R("Cuenta de cliente", "Cuenta de partner", "Cuenta de reseller", "Administrador", "Super-admin"),
    desc: R(
      "Descubre, guarda y solicita demos de soluciones digitales en el marketplace.",
      "Publica tu SaaS, gestiona leads y gana un reparto de ingresos 50/50.",
      "Promociona soluciones con tu código de referido y gana comisión en cada venta.",
      "Gestiona la plataforma: usuarios, soluciones, ingresos, pagos y más.",
      "Control total: usuarios y admins, ingresos, pagos, registro de auditoría y configuración."
    ),
    browse: "Ver soluciones", partnerPortal: "Portal de partner", newSolution: "Nueva solución",
    integrationApi: "API de integración", resellerDash: "Abrir panel de reseller", centralConsole: "Consola central",
    signOut: "Cerrar sesión", marketplace: "Marketplace", live: "Activa", pending: "En revisión", messages: "Mensajes", agreements: "Acuerdos"
  },
  ar: {
    badge: R("حساب عميل", "حساب شريك", "حساب موزّع", "مسؤول", "مسؤول أعلى"),
    desc: R(
      "اكتشف الحلول الرقمية واحفظها واطلب عروضًا توضيحية عبر السوق.",
      "أدرج منتج SaaS الخاص بك، وأدر العملاء المحتملين، واكسب تقاسمًا للإيرادات 50/50.",
      "روّج للحلول عبر رمز الإحالة الخاص بك واكسب عمولة على كل عملية بيع.",
      "أدر المنصة — المستخدمون والحلول والإيرادات والمدفوعات والمزيد.",
      "تحكم كامل: المستخدمون والمسؤولون والإيرادات والمدفوعات وسجل التدقيق والإعدادات."
    ),
    browse: "تصفّح الحلول", partnerPortal: "بوابة الشريك", newSolution: "حل جديد",
    integrationApi: "واجهة التكامل", resellerDash: "فتح لوحة الموزّع", centralConsole: "لوحة التحكم المركزية",
    signOut: "تسجيل الخروج", marketplace: "السوق", live: "مباشر", pending: "قيد المراجعة", messages: "الرسائل", agreements: "الاتفاقيات"
  },
  fr: {
    badge: R("Compte client", "Compte partenaire", "Compte revendeur", "Administrateur", "Super-admin"),
    desc: R(
      "Découvrez, enregistrez et demandez des démos de solutions sur la marketplace.",
      "Référencez votre SaaS, gérez vos leads et gagnez un partage de revenus 50/50.",
      "Promouvez des solutions avec votre code de parrainage et gagnez une commission.",
      "Gérez la plateforme — utilisateurs, solutions, revenus, paiements et plus.",
      "Contrôle total : utilisateurs et admins, revenus, paiements, journal d'audit, configuration."
    ),
    browse: "Parcourir les solutions", partnerPortal: "Portail partenaire", newSolution: "Nouvelle solution",
    integrationApi: "API d'intégration", resellerDash: "Ouvrir le tableau revendeur", centralConsole: "Console centrale",
    signOut: "Se déconnecter", marketplace: "Marketplace", live: "En ligne", pending: "En révision", messages: "Messages", agreements: "Contrats"
  },
  
  pt: {
    badge: R("Conta de cliente", "Conta de parceiro", "Conta de revendedor", "Administrador", "Super-admin"),
    desc: R(
      "Descubra, salve e solicite demos de soluções digitais no marketplace.",
      "Liste seu SaaS, gerencie leads e ganhe divisão de receita 50/50.",
      "Promova soluções com seu código de indicação e ganhe comissão em cada venda.",
      "Gerencie a plataforma — usuários, soluções, receita, pagamentos e mais.",
      "Controle total: usuários e admins, receita, pagamentos, log de auditoria e configuração."
    ),
    browse: "Ver soluções", partnerPortal: "Portal do parceiro", newSolution: "Nova solução",
    integrationApi: "API de integração", resellerDash: "Abrir painel do revendedor", centralConsole: "Console central",
    signOut: "Sair", marketplace: "Marketplace", live: "Ativa", pending: "Em revisão", messages: "Mensagens", agreements: "Acordos"
  }

  

};

export function getAccountMessages(locale: Locale): AccountMessages {
  return M[locale] ?? M.en;
}
