import type { Metadata } from "next";
import { LegalDoc, type LegalClause } from "@/components/LegalDoc";
import { getLocale } from "@/lib/i18n.server";
import { COMPANY } from "@/lib/content";
import { PAGE_META, localeMeta } from "@/lib/brand-content";

export async function generateMetadata(): Promise<Metadata> {
  return localeMeta("terms", await getLocale());
}
export const dynamic = "force-dynamic";

const UPDATED = "October 2, 2026";

const INTRO = [
  `These Terms of Service ("Terms") govern your access to and use of the ${COMPANY.domain} website and the services operated by ${COMPANY.name} ("we", "us"). By accessing or using the website or any of our services, you agree to be bound by these Terms. If you do not agree, do not use them.`,
  "If you use our services on behalf of a company or other entity, you represent that you are authorised to bind that entity, and \"you\" refers to that entity.",
];

const SECTIONS: LegalClause[] = [
  { h: "1. About the website", body: [
    `The ${COMPANY.domain} website presents ${COMPANY.name} — an engineering consultancy and general contracting office — together with its practice areas, activities, published work and careers.`,
    "The information is provided for general information purposes only. Nothing on this website is engineering advice for a specific site, structure or project: that is given only under a signed engagement, against a defined scope, by a named engineer.",
  ] },
  { h: "2. Visualisations and published imagery", body: [
    "Images in the media centre are visualisations and project imagery produced by this office. They illustrate design intent and the standard of our output. They are not a representation that any particular building has been completed, nor an offer of a specific result on your project: the as-built outcome depends on the brief, the site, the budget, the authorities and the contractor.",
    "No client is named and no commission is claimed anywhere on this website.",
  ] },
  { h: "3. Eligibility & accounts", body: [
    "Where our services require an account, you must be at least 18 years old and capable of forming a binding contract. You agree to provide accurate information, keep your credentials confidential, and are responsible for all activity under your account. Notify us immediately of any unauthorised use. We may suspend or close accounts that breach these Terms.",
  ] },
  { h: "4. Acceptable use", body: [
    "You agree not to: use the website or services unlawfully or in breach of third-party rights; misuse, resell, reverse-engineer, or circumvent access controls; upload malicious code; scrape or overload the website; misrepresent your identity; or use the website to send spam or infringing, harmful, or deceptive content. We may remove content and suspend access for violations.",
  ] },
  { h: "5. Intellectual property", body: [
    `The website, the ${COMPANY.name} brand, and the content we create — including text, drawings, models, renders and reports — are owned by ${COMPANY.name} or its licensors and are protected by law.`,
    "Drawings, models and reports issued to a client are licensed for the project they were produced for. They may not be reused on another site, issued to another designer or contractor as a basis for different work, or stripped of their title block and stamp, without our written agreement.",
    "You retain ownership of content you submit to us and grant us a licence to host and process it to deliver our services.",
  ] },
  { h: "6. Disclaimers", body: [
    "The website is provided \"as is\" and \"as available\" without warranties of any kind, whether express or implied, including merchantability, fitness for a particular purpose, and non-infringement, to the maximum extent permitted by law. We do not warrant that the website will be uninterrupted, error-free, or secure. Nothing in these Terms excludes liability that cannot be excluded by law — in particular, nothing here limits the professional liability an engineering practice carries for work it has stamped.",
  ] },
  { h: "7. Limitation of liability", body: [
    `To the maximum extent permitted by law, ${COMPANY.name} will not be liable for any indirect, incidental, special, consequential, or punitive damages, or for loss of profits, revenue, data, or goodwill, arising from your use of this website. Liability for services delivered under a signed engagement is governed by that engagement, not by these Terms. These limits do not apply to liability that cannot be limited under applicable law.`,
  ] },
  { h: "8. Indemnification", body: [
    `You agree to indemnify and hold harmless ${COMPANY.name} from claims, damages, and expenses (including reasonable legal fees) arising from your breach of these Terms, your misuse of the website, or your violation of any law or third-party right.`,
  ] },
  { h: "9. Suspension & termination", body: [
    "We may suspend or terminate your access if you breach these Terms, or where required to protect the website, other users, or comply with law. Sections that by their nature should survive termination (including intellectual property, disclaimers, liability, and governing law) will survive.",
  ] },
  { h: "10. Changes to the website and these Terms", body: [
    "We may modify, suspend, or discontinue parts of the website, and may update these Terms from time to time. Material changes will be posted here with a new \"last updated\" date. Your continued use after changes take effect constitutes acceptance.",
  ] },
  { h: "11. Governing law & disputes", body: [
    "These Terms are governed by the laws of the Arab Republic of Egypt, and the national courts have jurisdiction, without prejudice to any mandatory rights you have to bring proceedings in your country of residence. We encourage you to contact us first so we can try to resolve any dispute amicably.",
  ] },
  { h: "12. Contact", body: [
    `Questions about these Terms can be sent to ${COMPANY.name} at ${COMPANY.email}.`,
  ] },
];

export default async function TermsPage() {
  const locale = await getLocale();
  return <LegalDoc eyebrow="Legal" title="Terms of Service" updated={UPDATED} intro={INTRO} sections={SECTIONS} locale={locale} />;
}
