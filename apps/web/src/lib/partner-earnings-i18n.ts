import type { Locale } from "./i18n";

export type EarningsMessages = {
  link: string; title: string; subtitle: string;
  yourShare: string; gross: string; platformShare: string; sales: string; paid: string; owed: string;
  recentSales: string; noSales: string; recentPayouts: string; noPayouts: string;
  when: string; amount: string; share: string; note: string; threshold: string;
};

const E: Record<Locale, EarningsMessages> = {
  en: { link: "Earnings", title: "Earnings", subtitle: "Your revenue share of completed sales (set per solution) vs. what has been paid out. Balances under the minimum roll over to the next payout.", yourShare: "Your share (earned)", gross: "Gross sales", platformShare: "Unskinned share", sales: "Sales", paid: "Paid out", owed: "Owed to you", recentSales: "Recent sales", noSales: "No sales recorded yet.", recentPayouts: "Recent payouts", noPayouts: "No payouts yet.", when: "When", amount: "Gross", share: "Your share", note: "Note", threshold: "minimum payout" },
  es: { link: "Ingresos", title: "Ingresos", subtitle: "Tu parte del 50% de las ventas completadas frente a lo ya pagado. Los saldos bajo el mínimo se acumulan al siguiente pago.", yourShare: "Tu parte (ganado)", gross: "Ventas brutas", platformShare: "Parte Unskinned", sales: "Ventas", paid: "Pagado", owed: "Te deben", recentSales: "Ventas recientes", noSales: "Aún no hay ventas registradas.", recentPayouts: "Pagos recientes", noPayouts: "Aún no hay pagos.", when: "Cuándo", amount: "Bruto", share: "Tu parte", note: "Nota", threshold: "pago mínimo" },
  ar: { link: "الأرباح", title: "الأرباح", subtitle: "حصتك 50% من المبيعات المكتملة مقابل ما تم دفعه. تُرحّل الأرصدة دون الحد الأدنى إلى الدفعة التالية.", yourShare: "حصتك (المكتسبة)", gross: "إجمالي المبيعات", platformShare: "حصة Unskinned", sales: "المبيعات", paid: "المدفوع", owed: "المستحق لك", recentSales: "أحدث المبيعات", noSales: "لا مبيعات مسجّلة بعد.", recentPayouts: "أحدث المدفوعات", noPayouts: "لا مدفوعات بعد.", when: "متى", amount: "الإجمالي", share: "حصتك", note: "ملاحظة", threshold: "الحد الأدنى للدفع" },
  fr: { link: "Revenus", title: "Revenus", subtitle: "Votre part de 50% des ventes finalisées vs. ce qui a été payé. Les soldes sous le minimum sont reportés au prochain paiement.", yourShare: "Votre part (gagné)", gross: "Ventes brutes", platformShare: "Part Unskinned", sales: "Ventes", paid: "Payé", owed: "Dû", recentSales: "Ventes récentes", noSales: "Aucune vente enregistrée.", recentPayouts: "Paiements récents", noPayouts: "Aucun paiement.", when: "Quand", amount: "Brut", share: "Votre part", note: "Note", threshold: "paiement minimum" },
  
  pt: { link: "Ganhos", title: "Ganhos", subtitle: "Sua parte de 50% das vendas concluídas vs. o que já foi pago. Saldos abaixo do mínimo acumulam para o próximo pagamento.", yourShare: "Sua parte (ganho)", gross: "Vendas brutas", platformShare: "Parte Unskinned", sales: "Vendas", paid: "Pago", owed: "Devido a você", recentSales: "Vendas recentes", noSales: "Nenhuma venda registrada.", recentPayouts: "Pagamentos recentes", noPayouts: "Nenhum pagamento ainda.", when: "Quando", amount: "Bruto", share: "Sua parte", note: "Nota", threshold: "pagamento mínimo" }

  

};

export function getEarningsMessages(locale: Locale): EarningsMessages {
  return E[locale] ?? E.en;
}
