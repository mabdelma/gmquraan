import { prisma } from "@app/db";
import { COMPANY } from "./content";

/** Editable email/branding settings (stored as Setting key-value rows). */
export type EmailSettings = {
  brandName: string;
  fromName: string;
  footer: string;
  replyTo: string;
  logoUrl: string; // may be relative (/api/files/..) or absolute
};

const KEYS = ["email.brandName", "email.fromName", "email.footer", "email.replyTo", "email.logoUrl"] as const;

export const EMAIL_DEFAULTS: EmailSettings = {
  brandName: "Unskinned",
  fromName: "Unskinned",
  footer: "Unskinned · Your Digital Solutions Hub",
  replyTo: "",
  logoUrl: "",
};

/** Public base URL for turning relative upload paths into absolute (email-safe) URLs.
 *  Use the apex (no www) — the www host 301-redirects, which Outlook/Gmail image
 *  loading handles poorly. */
export const PUBLIC_BASE = (process.env.APP_URL || "https://gmquran.com")
  .replace(/^https?:\/\/www\./, "https://")
  .replace(/\/$/, "");

export function absoluteUrl(url: string): string {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${PUBLIC_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}

export async function getEmailSettings(): Promise<EmailSettings> {
  const rows = await prisma.setting.findMany({ where: { key: { in: KEYS as unknown as string[] } } });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    brandName: map.get("email.brandName") || EMAIL_DEFAULTS.brandName,
    fromName: map.get("email.fromName") || EMAIL_DEFAULTS.fromName,
    footer: map.get("email.footer") || EMAIL_DEFAULTS.footer,
    replyTo: map.get("email.replyTo") || EMAIL_DEFAULTS.replyTo,
    logoUrl: map.get("email.logoUrl") || EMAIL_DEFAULTS.logoUrl,
  };
}

/** Public-site contact settings (editable from the central dashboard). */
export type ContactSettings = { whatsapp: string };
/** The group's WhatsApp line. Overridable per-deployment at /central. */
/**
 * The call centre line — the same number COMPANY.phones publishes, so the
 * WhatsApp button and the footer cannot drift apart. Overridable per
 * deployment at /central, which takes precedence over this default.
 */
export const CONTACT_DEFAULTS: ContactSettings = { whatsapp: COMPANY.whatsapp.replace(/\D/g, "") };

/** WhatsApp number in wa.me format (digits only). DB setting wins; falls back to the default. */
export async function getContactSettings(): Promise<ContactSettings> {
  const row = await prisma.setting.findUnique({ where: { key: "contact.whatsapp" } });
  const raw = row?.value || CONTACT_DEFAULTS.whatsapp;
  return { whatsapp: raw.replace(/[^0-9]/g, "") };
}

export async function setContactSettings(s: Partial<ContactSettings>): Promise<void> {
  if (s.whatsapp === undefined) return;
  const digits = String(s.whatsapp).replace(/[^0-9]/g, "").slice(0, 20);
  if (!digits) return;
  await prisma.setting.upsert({
    where: { key: "contact.whatsapp" },
    create: { key: "contact.whatsapp", value: digits },
    update: { value: digits },
  });
}

/** Per-mailbox avatar/photo (stored by us; mailcow has no avatar field). Keyed by email. */
export async function getMailboxPhotos(): Promise<Record<string, string>> {
  const rows = await prisma.setting.findMany({ where: { key: { startsWith: "mboxPhoto:" } } });
  const out: Record<string, string> = {};
  for (const r of rows) out[r.key.slice("mboxPhoto:".length)] = r.value;
  return out;
}

export async function setMailboxPhoto(email: string, url: string): Promise<void> {
  const key = `mboxPhoto:${email.toLowerCase()}`;
  if (!url || url.trim() === "") {
    await prisma.setting.deleteMany({ where: { key } });
    return;
  }
  await prisma.setting.upsert({ where: { key }, create: { key, value: url }, update: { value: url } });
}

/** Transactional email templates an admin may customise (free-text leadReply excluded). */
export const EDITABLE_TEMPLATES = [
  "invite", "verify", "reset", "adminInvite",
  "solutionApproved", "payoutSent", "partnerDemoRequest", "demoUpdate", "alertDigest",
] as const;
export type EditableTemplate = (typeof EDITABLE_TEMPLATES)[number];

/** Per-template content override. Any blank field falls back to the built-in localized default. */
export type EmailTemplateOverride = { subject?: string; title?: string; body?: string; btn?: string; image?: string };
const TPL_FIELDS = ["subject", "title", "body", "btn", "image"] as const;

export async function getEmailTemplateOverrides(): Promise<Record<string, EmailTemplateOverride>> {
  const rows = await prisma.setting.findMany({ where: { key: { startsWith: "tpl." } } });
  const out: Record<string, EmailTemplateOverride> = {};
  for (const r of rows) {
    const parts = r.key.split("."); // tpl.<template>.<field>
    const tpl = parts[1];
    const field = parts[2];
    if (!tpl || !field) continue;
    (out[tpl] ??= {})[field as keyof EmailTemplateOverride] = r.value;
  }
  return out;
}

export async function getEmailTemplateOverride(template: string): Promise<EmailTemplateOverride> {
  return (await getEmailTemplateOverrides())[template] ?? {};
}

export async function setEmailTemplateOverride(template: string, fields: EmailTemplateOverride): Promise<void> {
  await Promise.all(
    TPL_FIELDS.map((field) => {
      const value = fields[field];
      if (value === undefined) return Promise.resolve();
      const key = `tpl.${template}.${field}`;
      // A blank value clears the override (revert to the localized default).
      if (value.trim() === "") return prisma.setting.deleteMany({ where: { key } });
      return prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
    })
  );
}

export async function setEmailSettings(s: Partial<EmailSettings>): Promise<void> {
  const entries: [string, string][] = [];
  if (s.brandName !== undefined) entries.push(["email.brandName", s.brandName]);
  if (s.fromName !== undefined) entries.push(["email.fromName", s.fromName]);
  if (s.footer !== undefined) entries.push(["email.footer", s.footer]);
  if (s.replyTo !== undefined) entries.push(["email.replyTo", s.replyTo]);
  if (s.logoUrl !== undefined) entries.push(["email.logoUrl", s.logoUrl]);
  await Promise.all(
    entries.map(([key, value]) =>
      prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } })
    )
  );
}
