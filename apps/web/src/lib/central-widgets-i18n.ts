import type { Locale } from "./i18n";

export type CentralWidgets = {
  live: string; mrr: string; total: string; today: string; subs: string; users: string;
  recordPayout: string; recordConfirm: string; working: string;
};

// {amt} = formatted amount in recordConfirm.
const W: Record<Locale, CentralWidgets> = {
  en: { live: "Live · updates every 8s", mrr: "MRR", total: "Total revenue", today: "Today", subs: "Active subs", users: "Users", recordPayout: "Record payout", recordConfirm: "Record a payout of {amt}?", working: "…" },
  es: { live: "En vivo · cada 8 s", mrr: "MRR", total: "Ingresos totales", today: "Hoy", subs: "Subs activas", users: "Usuarios", recordPayout: "Registrar pago", recordConfirm: "¿Registrar un pago de {amt}?", working: "…" },
  ar: { live: "مباشر · يُحدّث كل 8 ثوانٍ", mrr: "الإيراد الشهري", total: "إجمالي الإيرادات", today: "اليوم", subs: "اشتراكات نشطة", users: "المستخدمون", recordPayout: "تسجيل دفعة", recordConfirm: "تسجيل دفعة بقيمة {amt}؟", working: "…" },
  fr: { live: "En direct · toutes les 8 s", mrr: "MRR", total: "Revenus totaux", today: "Aujourd'hui", subs: "Abos actifs", users: "Utilisateurs", recordPayout: "Enregistrer le paiement", recordConfirm: "Enregistrer un paiement de {amt} ?", working: "…" },
  
  pt: { live: "Ao vivo · a cada 8 s", mrr: "MRR", total: "Receita total", today: "Hoje", subs: "Assin. ativas", users: "Usuários", recordPayout: "Registrar pagamento", recordConfirm: "Registrar um pagamento de {amt}?", working: "…" }

  

};

export function getCentralWidgets(locale: Locale): CentralWidgets {
  return W[locale] ?? W.en;
}
