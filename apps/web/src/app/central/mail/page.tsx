import { redirect } from "next/navigation";
import { getCentralAdmin } from "@/lib/central-session";
import { mailcowEnabled, listMailboxes, listAliases, getDomainStatus, MAIL_DOMAINS } from "@/lib/mailcow";
import { MailManager } from "@/components/MailManager";
import { MailStatus } from "@/components/MailStatus";
import { getLocale } from "@/lib/i18n.server";
import { getCentralPages } from "@/lib/central-pages-i18n";
import { getCentralForms } from "@/lib/central-forms-i18n";
import Link from "next/link";
import { getEmailBrandingMessages } from "@/lib/email-branding-i18n";
import { getEmailTemplatesMessages } from "@/lib/email-templates-i18n";
import { getEmailSettings, getMailboxPhotos } from "@/lib/settings";
import { EmailBrandingForm } from "@/components/EmailBrandingForm";

export const dynamic = "force-dynamic";

export default async function CentralMailPage() {
  const admin = await getCentralAdmin();
  if (!admin) redirect("/central");

  const enabled = mailcowEnabled();
  const [mbRes, aliasRes, statusRes] = enabled
    ? await Promise.all([listMailboxes(), listAliases(), getDomainStatus()])
    : ([null, null, null] as const);

  // A mail server that is down must not look like a domain with no mailboxes.
  const connectionError = [mbRes, aliasRes, statusRes].find((r) => r && !r.ok) as { error: string } | undefined;

  const photos = enabled && mbRes?.ok ? await getMailboxPhotos() : {};
  const mailboxes = (mbRes?.ok ? mbRes.data : []).map((m) => ({
    ...m,
    photo: photos[m.email.toLowerCase()] ?? "",
  }));
  const aliases = aliasRes?.ok ? aliasRes.data : [];
  const status = statusRes?.ok ? statusRes.data : null;
  const locale = await getLocale();
  const c = getCentralPages(locale).mail;
  const fm = getCentralForms(locale).mm;
  const eb = getEmailBrandingMessages(locale);
  const et = getEmailTemplatesMessages(locale);
  const emailSettings = await getEmailSettings();

  return (
    <section className="mx-auto max-w-5xl px-5 py-10">
      <h1 className="text-2xl font-extrabold">{c.title} — {MAIL_DOMAINS.join(", ")}</h1>
      <p className="text-[color:var(--ink)]/50 text-sm mt-1">{c.subtitle}</p>

      <div className="mt-8">
        <EmailBrandingForm initial={emailSettings} t={eb} />
      </div>

      <Link
        href="/central/email-templates"
        className="inline-block mt-4 text-sm border border-[color:var(--hairline)] rounded-lg px-4 py-2 hover:bg-[color:var(--overlay)]"
      >
        {et.title} →
      </Link>

      {!enabled ? (
        <p className="panel rounded-2xl p-6 mt-8 text-[color:var(--ink)]/50 text-sm">
          {c.notConfigured} Set <code>MAILCOW_API_URL</code> and <code>MAILCOW_API_KEY</code> in the server environment.
        </p>
      ) : connectionError ? (
        <div className="rounded-2xl p-6 mt-8 border border-red-500/40 bg-red-500/10">
          <div className="font-semibold text-red-800">{c.unreachable}</div>
          <p className="text-sm text-red-800/80 mt-1">{connectionError.error}</p>
          <p className="text-xs text-red-800/60 mt-3">{c.unreachableHint}</p>
        </div>
      ) : (
        <div className="mt-8">
          {status && <MailStatus s={status} t={fm} />}
          <MailManager mailboxes={mailboxes} aliases={aliases} domains={MAIL_DOMAINS} t={fm} />
        </div>
      )}
    </section>
  );
}
