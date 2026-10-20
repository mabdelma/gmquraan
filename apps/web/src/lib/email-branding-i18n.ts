import type { Locale } from "./i18n";

export type EmailBrandingMessages = {
  title: string; subtitle: string; logo: string; brandName: string; fromName: string;
  footer: string; replyTo: string; save: string; saving: string; saved: string;
};

const B: Record<Locale, EmailBrandingMessages> = {
  en: { title: "Email branding", subtitle: "Logo and details applied to every transactional email (renders in webmail, Gmail & Outlook).", logo: "Logo image (PNG or JPG — shown in emails)", brandName: "Brand name", fromName: "Sender name (From)", footer: "Footer line", replyTo: "Reply-to address", save: "Save branding", saving: "Saving…", saved: "Saved" },
  es: { title: "Marca del correo", subtitle: "Logo y detalles aplicados a cada correo transaccional (se ve en webmail, Gmail y Outlook).", logo: "Imagen del logo (PNG o JPG — se muestra en los correos)", brandName: "Nombre de marca", fromName: "Nombre del remitente (De)", footer: "Línea de pie", replyTo: "Dirección de respuesta", save: "Guardar marca", saving: "Guardando…", saved: "Guardado" },
  ar: { title: "هوية البريد", subtitle: "الشعار والتفاصيل المطبَّقة على كل بريد معاملات (تظهر في بريد الويب وGmail وOutlook).", logo: "صورة الشعار (PNG أو JPG — تظهر في الرسائل)", brandName: "اسم العلامة", fromName: "اسم المرسِل (من)", footer: "سطر التذييل", replyTo: "عنوان الرد", save: "حفظ الهوية", saving: "جارٍ الحفظ…", saved: "تم الحفظ" },
  fr: { title: "Identité e-mail", subtitle: "Logo et détails appliqués à chaque e-mail transactionnel (affichés dans webmail, Gmail et Outlook).", logo: "Image du logo (PNG ou JPG — affichée dans les e-mails)", brandName: "Nom de marque", fromName: "Nom de l'expéditeur (De)", footer: "Ligne de pied de page", replyTo: "Adresse de réponse", save: "Enregistrer", saving: "Enregistrement…", saved: "Enregistré" },
  
  pt: { title: "Identidade do e-mail", subtitle: "Logo e detalhes aplicados a cada e-mail transacional (aparece no webmail, Gmail e Outlook).", logo: "Imagem do logo (PNG ou JPG — exibida nos e-mails)", brandName: "Nome da marca", fromName: "Nome do remetente (De)", footer: "Linha de rodapé", replyTo: "Endereço de resposta", save: "Salvar identidade", saving: "Salvando…", saved: "Salvo" }

  

};

export function getEmailBrandingMessages(locale: Locale): EmailBrandingMessages {
  return B[locale] ?? B.en;
}
