import { redirect } from "next/navigation";
import Link from "next/link";
import { getCentralAdmin } from "@/lib/central-session";
import { getLocale } from "@/lib/i18n.server";
import { getEmailTemplatesMessages } from "@/lib/email-templates-i18n";
import { getEmailTemplateOverrides, EDITABLE_TEMPLATES } from "@/lib/settings";
import { EmailTemplateEditor, type EditorItem } from "@/components/EmailTemplateEditor";
import { translateBatch } from "@/lib/translate";

export const dynamic = "force-dynamic";

// English defaults shown as placeholders (mirror of the notifications service templates).
const DEFAULTS: Record<string, { subject: string; title: string; body: string; btn: string }> = {
  invite: { subject: "Your Example Company account", title: "Welcome to Example Company", body: "An account has been created for you. Set your password to sign in.", btn: "Set your password" },
  verify: { subject: "Verify your Example Company email", title: "Confirm your email", body: "Welcome to Example Company! Confirm your email to secure your account.", btn: "Verify email" },
  reset: { subject: "Reset your Example Company password", title: "Reset your password", body: "We received a request to reset your password.", btn: "Choose a new password" },
  adminInvite: { subject: "Set your Unskinned admin password", title: "You've been added as an admin", body: "Set your password to access the Unskinned staff console.", btn: "Set password" },
  solutionApproved: { subject: "Your solution is now live", title: "Your solution was approved", body: "Good news — your solution has been reviewed and is now live.", btn: "View your listing" },
  payoutSent: { subject: "You've been paid", title: "A payout is on its way", body: "We've recorded a payout for your share of completed sales. See the details in your earnings.", btn: "View earnings" },
  partnerDemoRequest: { subject: "New demo request for your solution", title: "You have a new demo request", body: "A client has requested a demo of one of your solutions.", btn: "View request" },
  demoUpdate: { subject: "Update on your demo request", title: "Your demo request was updated", body: "There's an update on a demo you requested.", btn: "View status" },
  alertDigest: { subject: "New solutions match your saved search", title: "New matches for you", body: "New solutions match a search you're following.", btn: "View matches" },
};

export default async function CentralEmailTemplatesPage() {
  const admin = await getCentralAdmin();
  if (!admin) redirect("/central");

  const locale = await getLocale();
  const t = getEmailTemplatesMessages(locale);
  const overrides = await getEmailTemplateOverrides();

  // Localize the English default previews to the console locale (cached in the Translation table).
  const keys = EDITABLE_TEMPLATES.filter((k) => DEFAULTS[k]);
  const flat = keys.flatMap((k) => [DEFAULTS[k].subject, DEFAULTS[k].title, DEFAULTS[k].body, DEFAULTS[k].btn]);
  const tr = await translateBatch(flat, locale);
  const localizedDef: Record<string, { subject: string; title: string; body: string; btn: string }> = {};
  keys.forEach((k, i) => {
    localizedDef[k] = { subject: tr[i * 4], title: tr[i * 4 + 1], body: tr[i * 4 + 2], btn: tr[i * 4 + 3] };
  });

  const items: EditorItem[] = EDITABLE_TEMPLATES.map((key) => ({
    key,
    name: t.names[key] ?? key,
    def: localizedDef[key] ?? DEFAULTS[key],
    override: overrides[key] ?? {},
  }));

  return (
    <section className="mx-auto max-w-3xl px-5 py-10">
      <Link href="/central/mail" className="text-sm text-[color:var(--ink)]/50 hover:text-[color:var(--ink)]">{t.back}</Link>
      <h1 className="text-2xl font-extrabold mt-3">{t.title}</h1>
      <p className="text-[color:var(--ink)]/50 mt-1 text-sm">{t.subtitle}</p>

      <div className="mt-8">
        <EmailTemplateEditor items={items} t={t} />
      </div>
    </section>
  );
}
