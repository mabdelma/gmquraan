import type { Locale } from "./i18n";

export type LeadMessages = {
  open: string; close: string; reply: string; replyPlaceholder: string; send: string; sending: string;
  sent: string; sendFailed: string; phone: string; company: string; received: string; noMessage: string;
};

const L: Record<Locale, LeadMessages> = {
  en: { open: "Open", close: "Close", reply: "Reply to this lead", replyPlaceholder: "Write your reply — it will be emailed to the lead…", send: "Send reply", sending: "Sending…", sent: "Reply sent", sendFailed: "Could not send — try again", phone: "Phone", company: "Company", received: "Received", noMessage: "No message provided." },
  es: { open: "Abrir", close: "Cerrar", reply: "Responder a este lead", replyPlaceholder: "Escribe tu respuesta — se enviará por correo al lead…", send: "Enviar respuesta", sending: "Enviando…", sent: "Respuesta enviada", sendFailed: "No se pudo enviar — inténtalo de nuevo", phone: "Teléfono", company: "Empresa", received: "Recibido", noMessage: "Sin mensaje." },
  ar: { open: "فتح", close: "إغلاق", reply: "الرد على هذا العميل", replyPlaceholder: "اكتب ردّك — سيُرسَل بالبريد إلى العميل…", send: "إرسال الرد", sending: "جارٍ الإرسال…", sent: "تم إرسال الرد", sendFailed: "تعذّر الإرسال — حاول مجددًا", phone: "الهاتف", company: "الشركة", received: "اُستلم", noMessage: "لا توجد رسالة." },
  fr: { open: "Ouvrir", close: "Fermer", reply: "Répondre à ce prospect", replyPlaceholder: "Rédigez votre réponse — elle sera envoyée par e-mail au prospect…", send: "Envoyer la réponse", sending: "Envoi…", sent: "Réponse envoyée", sendFailed: "Échec de l'envoi — réessayez", phone: "Téléphone", company: "Entreprise", received: "Reçu", noMessage: "Aucun message." },
  
  pt: { open: "Abrir", close: "Fechar", reply: "Responder a este lead", replyPlaceholder: "Escreva sua resposta — será enviada por e-mail ao lead…", send: "Enviar resposta", sending: "Enviando…", sent: "Resposta enviada", sendFailed: "Não foi possível enviar — tente novamente", phone: "Telefone", company: "Empresa", received: "Recebido", noMessage: "Sem mensagem." }

  

};

export function getLeadMessages(locale: Locale): LeadMessages {
  return L[locale] ?? L.en;
}
