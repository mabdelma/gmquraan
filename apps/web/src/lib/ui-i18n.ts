import type { Locale } from "./i18n";

/** Misc UI strings that don't belong to a page/feature dict (error boundary, a11y). */
export type ErrorLabels = { title: string; body: string; retry: string; home: string };

const ERR: Record<Locale, ErrorLabels> = {
  en: { title: "Something went wrong", body: "An unexpected error occurred. Please try again.", retry: "Try again", home: "Back to home" },
  es: { title: "Algo salió mal", body: "Ocurrió un error inesperado. Inténtalo de nuevo.", retry: "Reintentar", home: "Volver al inicio" },
  fr: { title: "Une erreur s'est produite", body: "Une erreur inattendue s'est produite. Veuillez réessayer.", retry: "Réessayer", home: "Retour à l'accueil" },
  
  pt: { title: "Algo deu errado", body: "Ocorreu um erro inesperado. Tente novamente.", retry: "Tentar novamente", home: "Voltar ao início" },

  ar: { title: "حدث خطأ ما", body: "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.", retry: "إعادة المحاولة", home: "العودة إلى الرئيسية" }

};

const SKIP: Record<Locale, string> = {
  en: "Skip to content", es: "Saltar al contenido", fr: "Aller au contenu", 
  pt: "Ir para o conteúdo",   ar: "تخطَّ إلى المحتوى"
    
};

/** Empty-list states across dashboards. */
export type EmptyLabels = { reviews: string; agreements: string; conversations: string; messages: string; resellerSales: string };
const EMPTY: Record<Locale, EmptyLabels> = {
  en: { reviews: "No reviews yet.", agreements: "No agreements yet.", conversations: "No conversations yet.", messages: "No messages yet.", resellerSales: "No cross-product sales reported yet." },
  es: { reviews: "Aún no hay reseñas.", agreements: "Aún no hay acuerdos.", conversations: "Aún no hay conversaciones.", messages: "Aún no hay mensajes.", resellerSales: "Aún no se han registrado ventas entre productos." },
  fr: { reviews: "Aucun avis pour le moment.", agreements: "Aucun accord pour le moment.", conversations: "Aucune conversation pour le moment.", messages: "Aucun message pour le moment.", resellerSales: "Aucune vente inter-produits signalée pour le moment." },
  
  pt: { reviews: "Ainda não há avaliações.", agreements: "Ainda não há acordos.", conversations: "Ainda não há conversas.", messages: "Ainda não há mensagens.", resellerSales: "Nenhuma venda entre produtos registrada ainda." },

  ar: { reviews: "لا توجد مراجعات بعد.", agreements: "لا توجد اتفاقيات بعد.", conversations: "لا توجد محادثات بعد.", messages: "لا توجد رسائل بعد.", resellerSales: "لم يتم الإبلاغ عن مبيعات بين المنتجات بعد." }

};

/** ARIA labels for icon-only controls. */
export type AriaLabels = { whatsapp: string; openMenu: string; collapseSidebar: string; dashboardNav: string };
const ARIA: Record<Locale, AriaLabels> = {
  en: { whatsapp: "Chat on WhatsApp", openMenu: "Open menu", collapseSidebar: "Collapse sidebar", dashboardNav: "Dashboard navigation" },
  es: { whatsapp: "Chatear por WhatsApp", openMenu: "Abrir menú", collapseSidebar: "Contraer barra lateral", dashboardNav: "Navegación del panel" },
  fr: { whatsapp: "Discuter sur WhatsApp", openMenu: "Ouvrir le menu", collapseSidebar: "Réduire la barre latérale", dashboardNav: "Navigation du tableau de bord" },
  
  pt: { whatsapp: "Conversar no WhatsApp", openMenu: "Abrir menu", collapseSidebar: "Recolher barra lateral", dashboardNav: "Navegação do painel" },

  ar: { whatsapp: "الدردشة على واتساب", openMenu: "فتح القائمة", collapseSidebar: "طي الشريط الجانبي", dashboardNav: "التنقل في لوحة التحكم" }

};

/** Change-password form. */
export type ChangePwLabels = { current: string; newPw: string; update: string; updated: string; failed: string };
const CHANGEPW: Record<Locale, ChangePwLabels> = {
  en: { current: "Current password", newPw: "New password (8+ characters)", update: "Update password", updated: "✓ Password updated", failed: "Failed" },
  es: { current: "Contraseña actual", newPw: "Nueva contraseña (8+ caracteres)", update: "Actualizar contraseña", updated: "✓ Contraseña actualizada", failed: "Error" },
  fr: { current: "Mot de passe actuel", newPw: "Nouveau mot de passe (8+ caractères)", update: "Mettre à jour le mot de passe", updated: "✓ Mot de passe mis à jour", failed: "Échec" },
  
  pt: { current: "Senha atual", newPw: "Nova senha (8+ caracteres)", update: "Atualizar senha", updated: "✓ Senha atualizada", failed: "Falhou" },

  ar: { current: "كلمة المرور الحالية", newPw: "كلمة مرور جديدة (8 أحرف أو أكثر)", update: "تحديث كلمة المرور", updated: "✓ تم تحديث كلمة المرور", failed: "فشل" }

};

/** Message composer. */
export type ComposerLabels = { placeholder: string; send: string };
const COMPOSER: Record<Locale, ComposerLabels> = {
  en: { placeholder: "Write a message…", send: "Send" },
  es: { placeholder: "Escribe un mensaje…", send: "Enviar" },
  fr: { placeholder: "Écrivez un message…", send: "Envoyer" },
  
  pt: { placeholder: "Escreva uma mensagem…", send: "Enviar" },

  ar: { placeholder: "اكتب رسالة…", send: "إرسال" }

};

/** New-agreement form. */
export type AgreementLabels = { sent: string; failed: string; title: string; license: string; subscription: string; service: string; counterpartyEmail: string; value: string; description: string; send: string };
const AGREEMENT: Record<Locale, AgreementLabels> = {
  en: { sent: "✓ Agreement sent", failed: "Failed", title: "Title", license: "License", subscription: "Subscription", service: "Service", counterpartyEmail: "Counterparty email", value: "Value (optional)", description: "Description (optional)", send: "Send agreement" },
  es: { sent: "✓ Acuerdo enviado", failed: "Error", title: "Título", license: "Licencia", subscription: "Suscripción", service: "Servicio", counterpartyEmail: "Correo de la contraparte", value: "Valor (opcional)", description: "Descripción (opcional)", send: "Enviar acuerdo" },
  fr: { sent: "✓ Accord envoyé", failed: "Échec", title: "Titre", license: "Licence", subscription: "Abonnement", service: "Service", counterpartyEmail: "E-mail de la contrepartie", value: "Valeur (facultatif)", description: "Description (facultatif)", send: "Envoyer l'accord" },
  
  pt: { sent: "✓ Acordo enviado", failed: "Falhou", title: "Título", license: "Licença", subscription: "Assinatura", service: "Serviço", counterpartyEmail: "E-mail da contraparte", value: "Valor (opcional)", description: "Descrição (opcional)", send: "Enviar acordo" },

  ar: { sent: "✓ تم إرسال الاتفاقية", failed: "فشل", title: "العنوان", license: "ترخيص", subscription: "اشتراك", service: "خدمة", counterpartyEmail: "البريد الإلكتروني للطرف الآخر", value: "القيمة (اختياري)", description: "الوصف (اختياري)", send: "إرسال الاتفاقية" }

};

/** Sign-agreement control. */
export type SignLabels = { signed: string; couldNotSign: string; legalName: string; sign: string };
const SIGN: Record<Locale, SignLabels> = {
  en: { signed: "You signed ✓", couldNotSign: "Could not sign", legalName: "Type your full legal name", sign: "Sign" },
  es: { signed: "Has firmado ✓", couldNotSign: "No se pudo firmar", legalName: "Escribe tu nombre legal completo", sign: "Firmar" },
  fr: { signed: "Vous avez signé ✓", couldNotSign: "Impossible de signer", legalName: "Saisissez votre nom légal complet", sign: "Signer" },
  
  pt: { signed: "Você assinou ✓", couldNotSign: "Não foi possível assinar", legalName: "Digite seu nome legal completo", sign: "Assinar" },

  ar: { signed: "لقد وقّعت ✓", couldNotSign: "تعذّر التوقيع", legalName: "اكتب اسمك القانوني الكامل", sign: "توقيع" }

};

/** Delete-solution confirm. `confirm` contains a {title} placeholder. */
export type DeleteLabels = { confirm: string; del: string };
const DELETE: Record<Locale, DeleteLabels> = {
  en: { confirm: 'Delete "{title}"? This cannot be undone.', del: "Delete" },
  es: { confirm: '¿Eliminar «{title}»? Esta acción no se puede deshacer.', del: "Eliminar" },
  fr: { confirm: 'Supprimer « {title} » ? Cette action est irréversible.', del: "Supprimer" },
  
  pt: { confirm: 'Excluir "{title}"? Isso não pode ser desfeito.', del: "Excluir" },

  ar: { confirm: 'حذف "{title}"؟ لا يمكن التراجع عن هذا.', del: "حذف" }

};

/** Image upload. `failed` contains a {status} placeholder. */
export type UploadLabels = { failed: string; networkError: string; uploading: string; replace: string; upload: string; remove: string; hint: string };
const UPLOAD: Record<Locale, UploadLabels> = {
  en: { failed: "Upload failed ({status})", networkError: "Network error — please try again.", uploading: "Uploading…", replace: "Replace photo", upload: "Upload photo", remove: "Remove", hint: "PNG, JPG or WebP, up to 10 MB." },
  es: { failed: "Error al subir ({status})", networkError: "Error de red: inténtalo de nuevo.", uploading: "Subiendo…", replace: "Reemplazar foto", upload: "Subir foto", remove: "Quitar", hint: "PNG, JPG o WebP, hasta 10 MB." },
  fr: { failed: "Échec du téléversement ({status})", networkError: "Erreur réseau — veuillez réessayer.", uploading: "Téléversement…", replace: "Remplacer la photo", upload: "Téléverser une photo", remove: "Supprimer", hint: "PNG, JPG ou WebP, jusqu'à 10 Mo." },
  
  pt: { failed: "Falha no upload ({status})", networkError: "Erro de rede — tente novamente.", uploading: "Enviando…", replace: "Substituir foto", upload: "Enviar foto", remove: "Remover", hint: "PNG, JPG ou WebP, até 10 MB." },

  ar: { failed: "فشل الرفع ({status})", networkError: "خطأ في الشبكة — يرجى المحاولة مرة أخرى.", uploading: "جارٍ الرفع…", replace: "استبدال الصورة", upload: "رفع صورة", remove: "إزالة", hint: "PNG أو JPG أو WebP، حتى 10 ميغابايت." }

};

export function getAgreementLabels(locale: Locale): AgreementLabels {
  return AGREEMENT[locale] ?? AGREEMENT.en;
}
export function getSignLabels(locale: Locale): SignLabels {
  return SIGN[locale] ?? SIGN.en;
}
export function getDeleteLabels(locale: Locale): DeleteLabels {
  return DELETE[locale] ?? DELETE.en;
}
export function getUploadLabels(locale: Locale): UploadLabels {
  return UPLOAD[locale] ?? UPLOAD.en;
}
/** Coupon-creation form (central admin). */
export type CouponLabels = { created: string; failed: string; codePh: string; percentOff: string; fixedEuro: string; amount: string; anyPlan: string; maxUses: string; create: string };
const COUPON: Record<Locale, CouponLabels> = {
  en: { created: "✓ Coupon created", failed: "Failed", codePh: "CODE (e.g. LAUNCH20)", percentOff: "% off", fixedEuro: "Fixed (€)", amount: "Amount", anyPlan: "Any paid plan", maxUses: "Max uses (blank = ∞)", create: "Create coupon" },
  es: { created: "✓ Cupón creado", failed: "Error", codePh: "CÓDIGO (ej. LAUNCH20)", percentOff: "% descuento", fixedEuro: "Fijo (€)", amount: "Importe", anyPlan: "Cualquier plan de pago", maxUses: "Usos máx. (vacío = ∞)", create: "Crear cupón" },
  fr: { created: "✓ Coupon créé", failed: "Échec", codePh: "CODE (ex. LAUNCH20)", percentOff: "% de réduction", fixedEuro: "Fixe (€)", amount: "Montant", anyPlan: "Tout plan payant", maxUses: "Utilisations max (vide = ∞)", create: "Créer le coupon" },
  
  pt: { created: "✓ Cupom criado", failed: "Falhou", codePh: "CÓDIGO (ex. LAUNCH20)", percentOff: "% de desconto", fixedEuro: "Fixo (€)", amount: "Valor", anyPlan: "Qualquer plano pago", maxUses: "Usos máx. (vazio = ∞)", create: "Criar cupom" },

  ar: { created: "✓ تم إنشاء القسيمة", failed: "فشل", codePh: "الرمز (مثال LAUNCH20)", percentOff: "٪ خصم", fixedEuro: "ثابت (€)", amount: "المبلغ", anyPlan: "أي خطة مدفوعة", maxUses: "أقصى استخدامات (فارغ = ∞)", create: "إنشاء قسيمة" }

};

export function getCouponLabels(locale: Locale): CouponLabels {
  return COUPON[locale] ?? COUPON.en;
}
export function getErrorLabels(locale: Locale): ErrorLabels {
  return ERR[locale] ?? ERR.en;
}
export function getSkipToContent(locale: Locale): string {
  return SKIP[locale] ?? SKIP.en;
}
export function getEmptyLabels(locale: Locale): EmptyLabels {
  return EMPTY[locale] ?? EMPTY.en;
}
export function getAriaLabels(locale: Locale): AriaLabels {
  return ARIA[locale] ?? ARIA.en;
}
export function getChangePwLabels(locale: Locale): ChangePwLabels {
  return CHANGEPW[locale] ?? CHANGEPW.en;
}
export function getComposerLabels(locale: Locale): ComposerLabels {
  return COMPOSER[locale] ?? COMPOSER.en;
}

/** Shared miscellaneous UI strings used across public, client and partner surfaces. */
export type UiLabels = {
  signIn: string; signOut: string; google: string; redirecting: string; checkoutUnavailable: string; couldNotCheckout: string;
  language: string; saveSearch: string; savedSearchDefault: string; subscribe: string; perMonth: string; planWord: string;
  savedSearches: string; newAgreement: string; withWord: string; allMessages: string; you: string; them: string;
  conversation: string; loading: string; edit: string; copied: string; alertsOn: string; registeredOffice: string; licenceWord: string;
  syndicateNo: string; registerNo: string; taxNo: string; validTo: string;
  partnershipHub: string; becomePartner: string; partnerPolicy: string;
};
const UI: Record<Locale, UiLabels> = {
  en: { signIn: "Sign in", signOut: "Sign out", google: "Continue with Google", redirecting: "Redirecting…", checkoutUnavailable: "Checkout unavailable", couldNotCheckout: "Could not start checkout", language: "Language", saveSearch: "Save search", savedSearchDefault: "Saved search", subscribe: "Subscribe", perMonth: "/mo", planWord: "plan", savedSearches: "Saved searches", newAgreement: "New agreement", withWord: "with", allMessages: "All messages", you: "You", them: "Them", conversation: "Conversation", loading: "Loading", edit: "Edit", copied: "✓ Copied", alertsOn: "alerts on", registeredOffice: "Registered office", licenceWord: "Licence", partnershipHub: "Partnership Hub", becomePartner: "Become a Partner", partnerPolicy: "Partner Policy", syndicateNo: "Syndicate reg.", registerNo: "Commercial register", taxNo: "Tax reg.", validTo: "valid to" },
  es: { signIn: "Iniciar sesión", signOut: "Cerrar sesión", google: "Continuar con Google", redirecting: "Redirigiendo…", checkoutUnavailable: "Pago no disponible", couldNotCheckout: "No se pudo iniciar el pago", language: "Idioma", saveSearch: "Guardar búsqueda", savedSearchDefault: "Búsqueda guardada", subscribe: "Suscribirse", perMonth: "/mes", planWord: "plan", savedSearches: "Búsquedas guardadas", newAgreement: "Nuevo acuerdo", withWord: "con", allMessages: "Todos los mensajes", you: "Tú", them: "Ellos", conversation: "Conversación", loading: "Cargando", edit: "Editar", copied: "✓ Copiado", alertsOn: "alertas activadas", registeredOffice: "Domicilio social", licenceWord: "Licencia", partnershipHub: "Centro de Colaboración", becomePartner: "Conviértete en Socio", partnerPolicy: "Política de Socios", syndicateNo: "Reg. del colegio", registerNo: "Registro mercantil", taxNo: "Reg. fiscal", validTo: "válida hasta" },
  fr: { signIn: "Se connecter", signOut: "Se déconnecter", google: "Continuer avec Google", redirecting: "Redirection…", checkoutUnavailable: "Paiement indisponible", couldNotCheckout: "Impossible de démarrer le paiement", language: "Langue", saveSearch: "Enregistrer la recherche", savedSearchDefault: "Recherche enregistrée", subscribe: "S'abonner", perMonth: "/mois", planWord: "forfait", savedSearches: "Recherches enregistrées", newAgreement: "Nouvel accord", withWord: "avec", allMessages: "Tous les messages", you: "Vous", them: "Eux", conversation: "Conversation", loading: "Chargement", edit: "Modifier", copied: "✓ Copié", alertsOn: "alertes activées", registeredOffice: "Siège social", licenceWord: "Licence", partnershipHub: "Hub de Partenariat", becomePartner: "Devenir Partenaire", partnerPolicy: "Politique Partenaire", syndicateNo: "Inscription à l'ordre", registerNo: "Registre du commerce", taxNo: "Immatriculation fiscale", validTo: "valable jusqu'au" },
  
  pt: { signIn: "Entrar", signOut: "Sair", google: "Continuar com o Google", redirecting: "Redirecionando…", checkoutUnavailable: "Checkout indisponível", couldNotCheckout: "Não foi possível iniciar o checkout", language: "Idioma", saveSearch: "Salvar busca", savedSearchDefault: "Busca salva", subscribe: "Assinar", perMonth: "/mês", planWord: "plano", savedSearches: "Buscas salvas", newAgreement: "Novo acordo", withWord: "com", allMessages: "Todas as mensagens", you: "Você", them: "Eles", conversation: "Conversa", loading: "Carregando", edit: "Editar", copied: "✓ Copiado", alertsOn: "alertas ativados", registeredOffice: "Sede social", licenceWord: "Licença", partnershipHub: "Hub de Parcerias", becomePartner: "Torne-se Parceiro", partnerPolicy: "Política de Parceiros", syndicateNo: "Reg. na ordem", registerNo: "Registo comercial", taxNo: "Reg. fiscal", validTo: "válida até" },

  ar: { signIn: "تسجيل الدخول", signOut: "تسجيل الخروج", google: "المتابعة عبر Google", redirecting: "جارٍ التحويل…", checkoutUnavailable: "الدفع غير متاح", couldNotCheckout: "تعذّر بدء الدفع", language: "اللغة", saveSearch: "حفظ البحث", savedSearchDefault: "بحث محفوظ", subscribe: "اشترك", perMonth: "/شهر", planWord: "خطة", savedSearches: "عمليات البحث المحفوظة", newAgreement: "اتفاقية جديدة", withWord: "مع", allMessages: "كل الرسائل", you: "أنت", them: "الطرف الآخر", conversation: "محادثة", loading: "جارٍ التحميل", edit: "تعديل", copied: "✓ تم النسخ", alertsOn: "التنبيهات مفعّلة", registeredOffice: "المقر المسجَّل", licenceWord: "الترخيص", partnershipHub: "مركز الشراكة", becomePartner: "كن شريكًا", partnerPolicy: "سياسة الشركاء", syndicateNo: "قيد النقابة", registerNo: "السجل التجاري", taxNo: "التسجيل الضريبي", validTo: "سارية حتى" }

};
export function getUi(locale: Locale): UiLabels {
  return UI[locale] ?? UI.en;
}

/** Additional common labels for client / partner / admin surfaces. */
export type UiBLabels = {
  changePassword: string; delete: string; approve: string; unapprove: string; revoke: string; active: string;
  revoked: string; never: string; close: string; used: string; byWord: string; actionFailed: string; failed: string;
  passwordUpdated: string; copyKeyOnce: string; productName: string; import: string; importing: string;
};
const UI_B: Record<Locale, UiBLabels> = {
  en: { changePassword: "Change password", delete: "Delete", approve: "Approve", unapprove: "Unapprove", revoke: "Revoke", active: "active", revoked: "revoked", never: "never", close: "Close", used: "used", byWord: "by", actionFailed: "Action failed", failed: "Failed", passwordUpdated: "Password updated.", copyKeyOnce: "Copy this key now — it won't be shown again:", productName: "Product name", import: "Import", importing: "Importing…" },
  es: { changePassword: "Cambiar contraseña", delete: "Eliminar", approve: "Aprobar", unapprove: "Desaprobar", revoke: "Revocar", active: "activo", revoked: "revocado", never: "nunca", close: "Cerrar", used: "usados", byWord: "por", actionFailed: "Acción fallida", failed: "Error", passwordUpdated: "Contraseña actualizada.", copyKeyOnce: "Copia esta clave ahora — no se volverá a mostrar:", productName: "Nombre del producto", import: "Importar", importing: "Importando…" },
  fr: { changePassword: "Changer le mot de passe", delete: "Supprimer", approve: "Approuver", unapprove: "Désapprouver", revoke: "Révoquer", active: "actif", revoked: "révoqué", never: "jamais", close: "Fermer", used: "utilisés", byWord: "par", actionFailed: "Échec de l'action", failed: "Échec", passwordUpdated: "Mot de passe mis à jour.", copyKeyOnce: "Copiez cette clé maintenant — elle ne sera plus affichée :", productName: "Nom du produit", import: "Importer", importing: "Importation…" },
  
  pt: { changePassword: "Alterar senha", delete: "Excluir", approve: "Aprovar", unapprove: "Reprovar", revoke: "Revogar", active: "ativo", revoked: "revogado", never: "nunca", close: "Fechar", used: "usados", byWord: "por", actionFailed: "Ação falhou", failed: "Falhou", passwordUpdated: "Senha atualizada.", copyKeyOnce: "Copie esta chave agora — ela não será mostrada novamente:", productName: "Nome do produto", import: "Importar", importing: "Importando…" },

  ar: { changePassword: "تغيير كلمة المرور", delete: "حذف", approve: "الموافقة", unapprove: "إلغاء الموافقة", revoke: "إلغاء", active: "نشط", revoked: "ملغى", never: "أبدًا", close: "إغلاق", used: "مُستخدَم", byWord: "بواسطة", actionFailed: "فشل الإجراء", failed: "فشل", passwordUpdated: "تم تحديث كلمة المرور.", copyKeyOnce: "انسخ هذا المفتاح الآن — لن يُعرض مرة أخرى:", productName: "اسم المنتج", import: "استيراد", importing: "جارٍ الاستيراد…" }

};
export function getUiB(locale: Locale): UiBLabels {
  return UI_B[locale] ?? UI_B.en;
}

/** Review moderation status words. */
export type ReviewStatus = { approved: string; pending: string };
const REVIEW_STATUS: Record<Locale, ReviewStatus> = {
  en: { approved: "approved", pending: "pending" },
  es: { approved: "aprobada", pending: "pendiente" },
  fr: { approved: "approuvé", pending: "en attente" },
  
  pt: { approved: "aprovada", pending: "pendente" },

  ar: { approved: "مُعتمَد", pending: "قيد الانتظار" }

};
export function getReviewStatus(locale: Locale): ReviewStatus {
  return REVIEW_STATUS[locale] ?? REVIEW_STATUS.en;
}
