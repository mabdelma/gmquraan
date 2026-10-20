import type { Locale } from "./i18n";

export type EmailTemplatesMessages = {
  title: string; subtitle: string; back: string;
  subject: string; heading: string; body: string; button: string; image: string;
  save: string; saving: string; saved: string; blankHint: string;
  names: Record<string, string>;
};

const NAMES_EN: Record<string, string> = {
  invite: "Account invite",
  verify: "Verify email",
  reset: "Password reset",
  adminInvite: "Admin invite",
  solutionApproved: "Solution approved",
  payoutSent: "Payout sent",
  partnerDemoRequest: "New demo request (to partner)",
  demoUpdate: "Demo request update",
  alertDigest: "Saved-search alert"
};

const E: Record<Locale, EmailTemplatesMessages> = {
  en: { title: "Email templates", subtitle: "Edit the wording and add a photo to each email. Leave a field blank to use the built-in translated default.", back: "← Email", subject: "Subject", heading: "Heading", body: "Body", button: "Button label", image: "Photo (PNG or JPG — shown in the email)", save: "Save", saving: "Saving…", saved: "Saved", blankHint: "Blank = default", names: NAMES_EN },
  es: { title: "Plantillas de correo", subtitle: "Edita el texto y añade una foto a cada correo. Deja un campo en blanco para usar el valor por defecto traducido.", back: "← Correo", subject: "Asunto", heading: "Título", body: "Cuerpo", button: "Texto del botón", image: "Foto (PNG o JPG — se muestra en el correo)", save: "Guardar", saving: "Guardando…", saved: "Guardado", blankHint: "Vacío = por defecto", names: { invite: "Invitación de cuenta", verify: "Verificar correo", reset: "Restablecer contraseña", adminInvite: "Invitación de admin", solutionApproved: "Solución aprobada", payoutSent: "Pago enviado", partnerDemoRequest: "Nueva solicitud de demo (al partner)", demoUpdate: "Actualización de demo", alertDigest: "Alerta de búsqueda guardada" } },
  ar: { title: "قوالب البريد", subtitle: "حرّر النص وأضف صورة لكل بريد. اترك الحقل فارغًا لاستخدام الإعداد الافتراضي المترجم.", back: "← البريد", subject: "الموضوع", heading: "العنوان", body: "النص", button: "نص الزر", image: "صورة (PNG أو JPG — تظهر في البريد)", save: "حفظ", saving: "جارٍ الحفظ…", saved: "تم الحفظ", blankHint: "فارغ = افتراضي", names: { invite: "دعوة حساب", verify: "تأكيد البريد", reset: "إعادة تعيين كلمة المرور", adminInvite: "دعوة مسؤول", solutionApproved: "تمت الموافقة على الحل", payoutSent: "تم إرسال الدفعة", partnerDemoRequest: "طلب عرض جديد (للشريك)", demoUpdate: "تحديث طلب العرض", alertDigest: "تنبيه بحث محفوظ" } },
  fr: { title: "Modèles d'e-mail", subtitle: "Modifiez le texte et ajoutez une photo à chaque e-mail. Laissez un champ vide pour utiliser la valeur traduite par défaut.", back: "← E-mail", subject: "Objet", heading: "Titre", body: "Corps", button: "Texte du bouton", image: "Photo (PNG ou JPG — affichée dans l'e-mail)", save: "Enregistrer", saving: "Enregistrement…", saved: "Enregistré", blankHint: "Vide = défaut", names: { invite: "Invitation de compte", verify: "Vérifier l'e-mail", reset: "Réinitialisation du mot de passe", adminInvite: "Invitation admin", solutionApproved: "Solution approuvée", payoutSent: "Paiement envoyé", partnerDemoRequest: "Nouvelle demande de démo (au partenaire)", demoUpdate: "Mise à jour de démo", alertDigest: "Alerte de recherche enregistrée" } },
  
  pt: { title: "Modelos de e-mail", subtitle: "Edite o texto e adicione uma foto a cada e-mail. Deixe um campo em branco para usar o padrão traduzido.", back: "← E-mail", subject: "Assunto", heading: "Título", body: "Corpo", button: "Texto do botão", image: "Foto (PNG ou JPG — exibida no e-mail)", save: "Salvar", saving: "Salvando…", saved: "Salvo", blankHint: "Vazio = padrão", names: { invite: "Convite de conta", verify: "Verificar e-mail", reset: "Redefinir senha", adminInvite: "Convite de admin", solutionApproved: "Solução aprovada", payoutSent: "Pagamento enviado", partnerDemoRequest: "Nova solicitação de demo (ao parceiro)", demoUpdate: "Atualização de demo", alertDigest: "Alerta de busca salva" } }

  

};

export function getEmailTemplatesMessages(locale: Locale): EmailTemplatesMessages {
  return E[locale] ?? E.en;
}
