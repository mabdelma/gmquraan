import { VoiceAdvisor } from "@/components/VoiceAdvisor";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getAgentMessages } from "@/lib/i18n";
import { getAgentLocale } from "@/lib/i18n.server";

export const dynamic = "force-dynamic";

export default async function AgentHome() {
  const locale = await getAgentLocale();
  const t = getAgentMessages(locale);
  return (
    <main dir={t.dir} className="container px-3 py-3 py-md-5" style={{ maxWidth: 1080 }}>
      <div className="d-flex justify-content-end align-items-center gap-2 mb-2 mb-md-3">
        <ThemeToggle />
        <LanguageSwitcher current={locale} />
      </div>
      <VoiceAdvisor t={t} />
    </main>
  );
}
