import type { Locale } from "./i18n";

/** Localized labels for the site-wide AI Advisor chat widget (client component). */
export type AdvisorWidgetLabels = {
  greeting: string;
  unavailable: string;
  networkError: string;
  openAria: string;
  title: string;
  voiceTitle: string;
  voiceBtn: string;
  typing: string;
  placeholder: string;
  send: string;
};

const M: Record<Locale, AdvisorWidgetLabels> = {
  en: { greeting: "Hi! I'm the Unskinned Solutions Advisor. What are you looking to launch?", unavailable: "Sorry, I'm unavailable right now.", networkError: "Network error — please try again.", openAria: "Open AI Solutions Advisor", title: "Unskinned Solutions Advisor", voiceTitle: "Talk to the advisor by voice", voiceBtn: "🎙 Talk by voice", typing: "Advisor is typing…", placeholder: "Describe what you need…", send: "Send" },
  es: { greeting: "¡Hola! Soy el Asesor de Soluciones de Unskinned. ¿Qué quieres lanzar?", unavailable: "Lo siento, no estoy disponible en este momento.", networkError: "Error de red: inténtalo de nuevo.", openAria: "Abrir el Asesor de Soluciones IA", title: "Asesor de Soluciones Unskinned", voiceTitle: "Habla con el asesor por voz", voiceBtn: "🎙 Hablar por voz", typing: "El asesor está escribiendo…", placeholder: "Describe lo que necesitas…", send: "Enviar" },
  fr: { greeting: "Bonjour ! Je suis le Conseiller Solutions Unskinned. Que souhaitez-vous lancer ?", unavailable: "Désolé, je ne suis pas disponible pour le moment.", networkError: "Erreur réseau — veuillez réessayer.", openAria: "Ouvrir le Conseiller Solutions IA", title: "Conseiller Solutions Unskinned", voiceTitle: "Parlez au conseiller par la voix", voiceBtn: "🎙 Parler par la voix", typing: "Le conseiller écrit…", placeholder: "Décrivez ce dont vous avez besoin…", send: "Envoyer" },
  
  pt: { greeting: "Olá! Sou o Consultor de Soluções da Unskinned. O que você quer lançar?", unavailable: "Desculpe, não estou disponível no momento.", networkError: "Erro de rede — tente novamente.", openAria: "Abrir o Consultor de Soluções IA", title: "Consultor de Soluções Unskinned", voiceTitle: "Fale com o consultor por voz", voiceBtn: "🎙 Falar por voz", typing: "O consultor está digitando…", placeholder: "Descreva o que você precisa…", send: "Enviar" },

  ar: { greeting: "مرحبًا! أنا مستشار حلول Unskinned. ما الذي تريد إطلاقه؟", unavailable: "عذرًا، أنا غير متاح الآن.", networkError: "خطأ في الشبكة — يرجى المحاولة مرة أخرى.", openAria: "فتح مستشار الحلول بالذكاء الاصطناعي", title: "مستشار حلول Unskinned", voiceTitle: "تحدث إلى المستشار صوتيًا", voiceBtn: "🎙 التحدث صوتيًا", typing: "المستشار يكتب…", placeholder: "صف ما تحتاجه…", send: "إرسال" }

  
};

export function getAdvisorWidgetLabels(locale: Locale): AdvisorWidgetLabels {
  return M[locale] ?? M.en;
}
