import { signToken } from "@app/shared";
import type { EmailRequest } from "@app/shared/types";
import { getEmailSettings, getEmailTemplateOverride, absoluteUrl } from "@/lib/settings";

const NOTIF = process.env.NOTIFICATIONS_URL_INTERNAL || "http://app-notifications:8080";

/**
 * Send a transactional email via the notifications service. Best-effort:
 * returns false (never throws) when the service or SMTP is unavailable, so
 * callers can proceed even when email isn't configured yet.
 *
 * Editable branding (logo, sender name, footer) is loaded from settings and
 * merged into every email so the logo renders in webmail, Gmail and Outlook.
 */
export async function sendEmail(req: EmailRequest): Promise<boolean> {
  try {
    let payload = req;
    try {
      const [s, ov] = await Promise.all([getEmailSettings(), getEmailTemplateOverride(req.template)]);
      payload = {
        ...req,
        fromName: req.fromName ?? s.fromName,
        vars: {
          logoUrl: absoluteUrl(s.logoUrl),
          brandName: s.brandName,
          footer: s.footer,
          replyTo: s.replyTo,
          // Per-template content overrides (blank fields fall back to the localized default).
          ovSubject: ov.subject,
          ovTitle: ov.title,
          ovBody: ov.body,
          ovBtn: ov.btn,
          tplImage: ov.image ? absoluteUrl(ov.image) : undefined,
          ...req.vars,
        },
      };
    } catch {
      /* settings unavailable (e.g. DB down) — send without branding */
    }
    const token = signToken({ sub: "web", role: "service", ttlMs: 60_000 });
    const res = await fetch(`${NOTIF}/v1/notifications/email/send`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
