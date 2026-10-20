import type { Locale } from "./i18n";

export type SavedMessages = {
  save: string; saved: string; savedProducts: string; empty: string; browse: string;
};

const S: Record<Locale, SavedMessages> = {
  en: { save: "Save", saved: "Saved", savedProducts: "Saved products", empty: "You haven't saved any products yet.", browse: "Browse the marketplace" },
  es: { save: "Guardar", saved: "Guardado", savedProducts: "Productos guardados", empty: "Aún no has guardado productos.", browse: "Explorar el marketplace" },
  ar: { save: "حفظ", saved: "محفوظ", savedProducts: "المنتجات المحفوظة", empty: "لم تحفظ أي منتجات بعد.", browse: "تصفّح السوق" },
  fr: { save: "Enregistrer", saved: "Enregistré", savedProducts: "Produits enregistrés", empty: "Vous n'avez encore enregistré aucun produit.", browse: "Parcourir le marketplace" },
  
  pt: { save: "Salvar", saved: "Salvo", savedProducts: "Produtos salvos", empty: "Você ainda não salvou nenhum produto.", browse: "Explorar o marketplace" }

  

};

export function getSavedMessages(locale: Locale): SavedMessages {
  return S[locale] ?? S.en;
}
