import type { Locale } from "./i18n";

/** Localized labels for the Web Push opt-in (client component receives these as props). */
export type PushLabels = { enable: string; enabling: string; enabled: string; blocked: string };

const M: Record<Locale, PushLabels> = {
  en: { enable: "🔔 Enable notifications", enabling: "Enabling…", enabled: "🔔 Notifications enabled on this device.", blocked: "Notifications are blocked in your browser settings." },
  es: { enable: "🔔 Activar notificaciones", enabling: "Activando…", enabled: "🔔 Notificaciones activadas en este dispositivo.", blocked: "Las notificaciones están bloqueadas en la configuración de tu navegador." },
  fr: { enable: "🔔 Activer les notifications", enabling: "Activation…", enabled: "🔔 Notifications activées sur cet appareil.", blocked: "Les notifications sont bloquées dans les paramètres de votre navigateur." },
  
  pt: { enable: "🔔 Ativar notificações", enabling: "Ativando…", enabled: "🔔 Notificações ativadas neste dispositivo.", blocked: "As notificações estão bloqueadas nas configurações do seu navegador." },

  ar: { enable: "🔔 تفعيل الإشعارات", enabling: "جارٍ التفعيل…", enabled: "🔔 تم تفعيل الإشعارات على هذا الجهاز.", blocked: "الإشعارات محظورة في إعدادات متصفحك." }

  
};

export function getPushMessages(locale: Locale): PushLabels {
  return M[locale] ?? M.en;
}
