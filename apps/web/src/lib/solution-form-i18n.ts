import type { Locale } from "./i18n";

export type SolutionFormMessages = {
  liveUrl: string; liveUrlHint: string; share: string; shareHint: string; policy: string;
  logo: string; liveStatus: string; saveChanges: string; appId: string; live: string; pending: string;
  regionGlobal: string; regionGcc: string; regionEurope: string; couldNotSave: string;
};

const S: Record<Locale, SolutionFormMessages> = {
  en: { liveUrl: "Live web app URL", liveUrlHint: "Where the running product lives (linked from the listing).", share: "Partner revenue share (%)", shareHint: "Standard split is 50/50 per the", policy: "Partner Policy", logo: "Logo / image", liveStatus: "Live (visible on the marketplace)", saveChanges: "Save changes", appId: "Application ID", live: "Live", pending: "Pending review", regionGlobal: "Global", regionGcc: "GCC", regionEurope: "Europe", couldNotSave: "Could not save" },
  es: { liveUrl: "URL de la app en vivo", liveUrlHint: "Dónde está el producto en funcionamiento (enlazado desde el anuncio).", share: "Reparto de ingresos del partner (%)", shareHint: "El reparto estándar es 50/50 según la", policy: "Política de Partner", logo: "Logo / imagen", liveStatus: "Activa (visible en el marketplace)", saveChanges: "Guardar cambios", appId: "ID de aplicación", live: "Activa", pending: "Pendiente de revisión", regionGlobal: "Global", regionGcc: "CCG", regionEurope: "Europa", couldNotSave: "No se pudo guardar" },
  ar: { liveUrl: "رابط تطبيق الويب المباشر", liveUrlHint: "مكان وجود المنتج العامل (مرتبط من الإدراج).", share: "حصة الشريك من الإيرادات (%)", shareHint: "التقسيم القياسي هو 50/50 وفق", policy: "سياسة الشريك", logo: "الشعار / الصورة", liveStatus: "مباشر (مرئي في السوق)", saveChanges: "حفظ التغييرات", appId: "معرّف التطبيق", live: "مباشر", pending: "بانتظار المراجعة", regionGlobal: "عالمي", regionGcc: "دول الخليج", regionEurope: "أوروبا", couldNotSave: "تعذّر الحفظ" },
  fr: { liveUrl: "URL de l'app en ligne", liveUrlHint: "Où se trouve le produit en fonctionnement (lié depuis l'annonce).", share: "Part de revenus du partenaire (%)", shareHint: "Le partage standard est 50/50 selon la", policy: "Politique de Partenaire", logo: "Logo / image", liveStatus: "En ligne (visible sur le marketplace)", saveChanges: "Enregistrer", appId: "ID de l'application", live: "En ligne", pending: "En attente de validation", regionGlobal: "Mondial", regionGcc: "CCG", regionEurope: "Europe", couldNotSave: "Échec de l'enregistrement" },
  
  pt: { liveUrl: "URL do app ao vivo", liveUrlHint: "Onde o produto em funcionamento está (vinculado do anúncio).", share: "Parte de receita do parceiro (%)", shareHint: "A divisão padrão é 50/50 conforme a", policy: "Política de Parceiro", logo: "Logo / imagem", liveStatus: "Ativa (visível no marketplace)", saveChanges: "Salvar alterações", appId: "ID da aplicação", live: "Ativa", pending: "Aguardando revisão", regionGlobal: "Global", regionGcc: "CCG", regionEurope: "Europa", couldNotSave: "Não foi possível salvar" }

  

};

export function getSolutionFormMessages(locale: Locale): SolutionFormMessages {
  return S[locale] ?? S.en;
}
