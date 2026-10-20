import type { Locale } from "./i18n";

export type CentralMessages = {
  nav: {
    overview: string; revenue: string; payouts: string; users: string; email: string;
    resellers: string; solutions: string; leads: string; analytics: string; audit: string; hub: string; workforce: string; branches: string;
 site: string;
  };
  signOut: string;
  login: { title: string; subtitle: string; email: string; password: string; signIn: string; signingIn: string };
};

const C: Record<Locale, CentralMessages> = {
  en: {
    nav: { overview: "Overview", revenue: "Revenue", payouts: "Payouts", users: "Users", email: "Email", resellers: "Resellers", solutions: "Solutions", leads: "Leads", analytics: "Analytics", audit: "Audit log", hub: "Hub", workforce: "Workforce", branches: "Branches", site: "Site content" },
    signOut: "Sign out",
    login: { title: "Staff sign in", subtitle: "Restricted — administrators only.", email: "Admin email", password: "Password", signIn: "Sign in to console", signingIn: "Signing in…" }
  },
  es: {
    nav: { overview: "Resumen", revenue: "Ingresos", payouts: "Pagos", users: "Usuarios", email: "Correo", resellers: "Resellers", solutions: "Soluciones", leads: "Leads", analytics: "Analítica", audit: "Auditoría", hub: "Hub", workforce: "Equipo", branches: "Sedes", site: "Contenido" },
    signOut: "Cerrar sesión",
    login: { title: "Acceso de personal", subtitle: "Restringido — solo administradores.", email: "Correo de administrador", password: "Contraseña", signIn: "Entrar a la consola", signingIn: "Entrando…" }
  },
  ar: {
    nav: { overview: "نظرة عامة", revenue: "الإيرادات", payouts: "المدفوعات", users: "المستخدمون", email: "البريد", resellers: "الموزّعون", solutions: "الحلول", leads: "العملاء المحتملون", analytics: "التحليلات", audit: "سجل التدقيق", hub: "المركز", workforce: "فريق العمل", branches: "الفروع", site: "محتوى الموقع" },
    signOut: "تسجيل الخروج",
    login: { title: "دخول الموظفين", subtitle: "محصور — للمسؤولين فقط.", email: "بريد المسؤول", password: "كلمة المرور", signIn: "الدخول إلى اللوحة", signingIn: "جارٍ الدخول…" }
  },
  fr: {
    nav: { overview: "Aperçu", revenue: "Revenus", payouts: "Paiements", users: "Utilisateurs", email: "E-mail", resellers: "Revendeurs", solutions: "Solutions", leads: "Prospects", analytics: "Analytique", audit: "Journal d'audit", hub: "Hub", workforce: "Équipe", branches: "Filiales", site: "Contenu du site" },
    signOut: "Se déconnecter",
    login: { title: "Connexion du personnel", subtitle: "Restreint — administrateurs uniquement.", email: "E-mail administrateur", password: "Mot de passe", signIn: "Se connecter à la console", signingIn: "Connexion…" }
  },
  
  pt: {
    nav: { overview: "Visão geral", revenue: "Receita", payouts: "Pagamentos", users: "Usuários", email: "E-mail", resellers: "Revendedores", solutions: "Soluções", leads: "Leads", analytics: "Análises", audit: "Auditoria", hub: "Hub", workforce: "Equipe", branches: "Filiais", site: "Conteúdo do site" },
    signOut: "Sair",
    login: { title: "Acesso da equipe", subtitle: "Restrito — apenas administradores.", email: "E-mail do administrador", password: "Senha", signIn: "Entrar no console", signingIn: "Entrando…" }
  }

  

};

export function getCentralMessages(locale: Locale): CentralMessages {
  return C[locale] ?? C.en;
}
