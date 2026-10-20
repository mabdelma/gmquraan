/**
 * Localized email templates (subset). Falls back to English when a locale
 * isn't translated. RTL for Arabic (GCC market).
 */

type Entry = { subject: string; title: string; body: string; btn: string };
type Dict = {
  verify: Entry;
  reset: Entry;
  adminInvite: Entry;
  invite: Entry;
  solutionApproved: Entry;
  payoutSent: Entry;
  leadReply: Entry;
  partnerDemoRequest: Entry;
  demoUpdate: Entry;
  alertDigest: Entry;
  systemAlert: Entry;
  workforceSignIn: Entry;
};

const en: Dict = {
  verify: { subject: "Verify your Unskinned email", title: "Confirm your email", body: "Welcome to Unskinned! Confirm your email to secure your account.", btn: "Verify email" },
  reset: { subject: "Reset your Unskinned password", title: "Reset your password", body: "We received a request to reset your password.", btn: "Choose a new password" },
  adminInvite: { subject: "Set your Unskinned admin password", title: "You've been added as an admin", body: "Set your password to access the Unskinned staff console.", btn: "Set password" },
  invite: { subject: "Your Unskinned account", title: "Welcome to Unskinned", body: "An account has been created for you. Set your password to sign in to your Digital Solutions Hub.", btn: "Set your password" },
  solutionApproved: { subject: "Your solution is now live on Unskinned", title: "Your solution was approved", body: "Good news — your solution has been reviewed and is now live on the Unskinned marketplace.", btn: "View your listing" },
  payoutSent: { subject: "You've been paid by Unskinned", title: "A payout is on its way", body: "We've recorded a payout for your share of completed sales. See the details in your earnings.", btn: "View earnings" },
  leadReply: { subject: "Reply from Unskinned", title: "A reply to your enquiry", body: "", btn: "" },
  partnerDemoRequest: { subject: "New demo request for your solution", title: "You have a new demo request", body: "A client has requested a demo of one of your solutions on the Unskinned marketplace.", btn: "View request" },
  demoUpdate: { subject: "Update on your demo request", title: "Your demo request was updated", body: "There's an update on a demo you requested on the Unskinned marketplace.", btn: "View status" },
  alertDigest: { subject: "New solutions match your saved search", title: "New on the Unskinned marketplace", body: "New solutions match a search you're following.", btn: "View matches" },
  systemAlert: { subject: "Unskinned system alert", title: "System alert", body: "", btn: "" },
  workforceSignIn: { subject: "Your GM-OS sign-in link", title: "Sign in to the team portal", body: "Use the button below to sign in. The link works once and expires in 15 minutes. If you did not ask for it, you can ignore this email — nothing has changed on your account.", btn: "Sign in" },
};
const es: Dict = {
  verify: { subject: "Verifica tu correo de Unskinned", title: "Confirma tu correo", body: "¡Bienvenido a Unskinned! Confirma tu correo para proteger tu cuenta.", btn: "Verificar correo" },
  reset: { subject: "Restablece tu contraseña de Unskinned", title: "Restablece tu contraseña", body: "Recibimos una solicitud para restablecer tu contraseña.", btn: "Elegir nueva contraseña" },
  adminInvite: { subject: "Configura tu contraseña de administrador", title: "Se te ha añadido como administrador", body: "Configura tu contraseña para acceder a la consola.", btn: "Configurar contraseña" },
  invite: { subject: "Tu cuenta de Unskinned", title: "Bienvenido a Unskinned", body: "Se ha creado una cuenta para ti. Configura tu contraseña para acceder a tu Hub de Soluciones Digitales.", btn: "Configurar contraseña" },
  solutionApproved: { subject: "Tu solución ya está activa en Unskinned", title: "Tu solución fue aprobada", body: "Buenas noticias: tu solución ha sido revisada y ya está activa en el marketplace de Unskinned.", btn: "Ver tu anuncio" },
  payoutSent: { subject: "Has recibido un pago de Unskinned", title: "Un pago está en camino", body: "Hemos registrado un pago por tu parte de las ventas completadas. Consulta los detalles en tus ingresos.", btn: "Ver ingresos" },
  leadReply: { subject: "Respuesta de Unskinned", title: "Respuesta a tu consulta", body: "", btn: "" },
  partnerDemoRequest: { subject: "Nueva solicitud de demo para tu solución", title: "Tienes una nueva solicitud de demo", body: "Un cliente ha solicitado una demo de una de tus soluciones en el marketplace de Unskinned.", btn: "Ver solicitud" },
  demoUpdate: { subject: "Actualización de tu solicitud de demo", title: "Tu solicitud de demo se actualizó", body: "Hay una actualización sobre una demo que solicitaste en el marketplace de Unskinned.", btn: "Ver estado" },
  alertDigest: { subject: "Nuevas soluciones coinciden con tu búsqueda", title: "Novedades en el marketplace de Unskinned", body: "Nuevas soluciones coinciden con una búsqueda que sigues.", btn: "Ver coincidencias" },
  systemAlert: { subject: "Alerta del sistema Unskinned", title: "Alerta del sistema", body: "", btn: "" },
  workforceSignIn: { subject: "Tu enlace de acceso a GM-OS", title: "Accede al portal del equipo", body: "Usa el botón para iniciar sesión. El enlace funciona una sola vez y caduca en 15 minutos. Si no lo has solicitado, puedes ignorar este correo: no ha cambiado nada en tu cuenta.", btn: "Iniciar sesión" },
};
const ar: Dict = {
  verify: { subject: "تأكيد بريدك في Unskinned", title: "أكّد بريدك الإلكتروني", body: "مرحبًا بك في Unskinned! أكّد بريدك لتأمين حسابك.", btn: "تأكيد البريد" },
  reset: { subject: "إعادة تعيين كلمة المرور", title: "إعادة تعيين كلمة المرور", body: "تلقّينا طلبًا لإعادة تعيين كلمة مرورك.", btn: "اختر كلمة مرور جديدة" },
  adminInvite: { subject: "تعيين كلمة مرور المسؤول", title: "تمت إضافتك كمسؤول", body: "عيّن كلمة المرور للوصول إلى لوحة الموظفين.", btn: "تعيين كلمة المرور" },
  invite: { subject: "حسابك في Unskinned", title: "مرحبًا بك في Unskinned", body: "تم إنشاء حساب لك. عيّن كلمة المرور لتسجيل الدخول إلى مركز الحلول الرقمية.", btn: "تعيين كلمة المرور" },
  solutionApproved: { subject: "حلّك الآن مباشر على Unskinned", title: "تمت الموافقة على حلّك", body: "أخبار جيدة — تمت مراجعة حلّك وأصبح الآن مباشرًا في سوق Unskinned.", btn: "عرض إعلانك" },
  payoutSent: { subject: "وصلتك دفعة من Unskinned", title: "دفعة في طريقها إليك", body: "سجّلنا دفعة مقابل حصتك من المبيعات المكتملة. اطّلع على التفاصيل في أرباحك.", btn: "عرض الأرباح" },
  leadReply: { subject: "رد من Unskinned", title: "رد على استفسارك", body: "", btn: "" },
  partnerDemoRequest: { subject: "طلب عرض توضيحي جديد لحلّك", title: "لديك طلب عرض توضيحي جديد", body: "طلب أحد العملاء عرضًا توضيحيًا لأحد حلولك في سوق Unskinned.", btn: "عرض الطلب" },
  demoUpdate: { subject: "تحديث على طلب العرض التوضيحي", title: "تم تحديث طلب العرض التوضيحي", body: "هناك تحديث بخصوص عرض توضيحي طلبته في سوق Unskinned.", btn: "عرض الحالة" },
  alertDigest: { subject: "حلول جديدة تطابق بحثك المحفوظ", title: "جديد في سوق Unskinned", body: "حلول جديدة تطابق بحثًا تتابعه.", btn: "عرض النتائج" },
  systemAlert: { subject: "تنبيه نظام Unskinned", title: "تنبيه النظام", body: "", btn: "" },
  workforceSignIn: { subject: "رابط الدخول إلى GM-OS", title: "الدخول إلى بوابة الفريق", body: "استخدم الزر أدناه لتسجيل الدخول. الرابط يعمل مرة واحدة وتنتهي صلاحيته خلال 15 دقيقة. إذا لم تطلبه، يمكنك تجاهل هذه الرسالة — لم يتغير شيء في حسابك.", btn: "تسجيل الدخول" },
};

const DICTS: Record<string, Dict> = { en, es, ar };

function layout(title: string, body: string, dir: "ltr" | "rtl", logoUrl?: string, footer?: string) {
  // Absolute https image URL renders across webmail, Gmail and Outlook (no SVG/CID).
  const logo = logoUrl
    ? `<img src="${logoUrl}" alt="" width="140" style="max-width:200px;height:auto;display:block;margin-bottom:18px;border:0;outline:none;text-decoration:none">`
    : "";
  const foot = footer || "Unskinned · Your Digital Solutions Hub";
  return `<!doctype html><html dir="${dir}"><body style="font-family:system-ui,sans-serif;background:#0b1220;color:#e8eefc;padding:24px">
  <div style="max-width:520px;margin:auto;background:#101a30;border-radius:16px;padding:28px">
  ${logo}<h1 style="color:#fbbf24;font-size:20px">${title}</h1>${body}
  <p style="color:#7e8aa3;font-size:12px;margin-top:24px">${foot}</p></div></body></html>`;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function renderEmail(
  template: keyof Dict,
  locale: string | undefined,
  vars: Record<string, unknown>
): { subject: string; html: string } {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const d = DICTS[locale ?? "en"] ?? en;
  const tpl = d[template] ?? en[template];
  const logoUrl = typeof vars.logoUrl === "string" && vars.logoUrl ? String(vars.logoUrl) : undefined;
  const footer = typeof vars.footer === "string" && vars.footer ? escapeHtml(String(vars.footer)) : undefined;

  // Admin-editable per-template overrides (blank → built-in localized default).
  const ov = (k: string) => (typeof vars[k] === "string" && vars[k] ? String(vars[k]) : undefined);
  const subject = ov("ovSubject") ?? tpl.subject;
  const title = escapeHtml(ov("ovTitle") ?? tpl.title);
  const bodyText = ov("ovBody") ?? tpl.body;
  const btnLabel = escapeHtml(ov("ovBtn") ?? tpl.btn);
  // Optional per-template photo (rendered above the heading).
  const tplImage = ov("tplImage");
  const banner = tplImage
    ? `<img src="${tplImage}" alt="" style="max-width:100%;height:auto;border-radius:12px;margin-bottom:18px;border:0;display:block">`
    : "";

  // Free-text templates (lead reply, ops/system alert): the body is the message itself.
  if (template === "leadReply" || template === "systemAlert") {
    const msg = escapeHtml(String(vars.message ?? "")).replace(/\n/g, "<br>");
    const subj = template === "systemAlert" ? (ov("alertSubject") ?? subject) : subject;
    return { subject: subj, html: layout(title, `${banner}<p style="color:#c7d2e6">${msg}</p>`, dir, logoUrl, footer) };
  }

  const url = String(vars.url ?? "#");
  const bodyHtml = escapeHtml(bodyText).replace(/\n/g, "<br>");
  const btn = btnLabel
    ? `<a href="${url}" style="display:inline-block;margin-top:16px;background:linear-gradient(90deg,#f59e0b,#fbbf24);color:#080f1e;font-weight:700;padding:12px 20px;border-radius:12px;text-decoration:none">${btnLabel}</a>`
    : "";
  return { subject, html: layout(title, `${banner}<p style="color:#c7d2e6">${bodyHtml}</p>${btn}`, dir, logoUrl, footer) };
}
