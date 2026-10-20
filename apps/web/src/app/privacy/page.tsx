import type { Metadata } from "next";
import { LegalDoc, type LegalClause } from "@/components/LegalDoc";
import { getLocale } from "@/lib/i18n.server";
import { COMPANY, REGISTRATION } from "@/lib/content";
import { PAGE_META, localeMeta } from "@/lib/brand-content";

export async function generateMetadata(): Promise<Metadata> {
  return localeMeta("privacy", await getLocale());
}
export const dynamic = "force-dynamic";

const UPDATED = "October 2, 2026";

/**
 * The governing law is Example Country, not the UAE: the office is national and its
 * offices are in Capital City and North City. The reference is to Law No. 151 of 2020 on
 * the Protection of Personal Data, which is the national statute — the UAE
 * PDPL has no application here and citing it would be a worse error than
 * citing nothing.
 */
const INTRO = [
  `${COMPANY.name} ("we", "us", or "our") is an engineering consultancy and general contracting office based in Example Country. We are committed to protecting your personal data and respecting your privacy. This Privacy Policy explains what personal data we collect, why and how we process it, who we share it with, how long we keep it, and the rights you have over it.`,
  `For the purposes of national Law No. 151 of 2020 on the Protection of Personal Data, ${COMPANY.name} acts as the data controller for personal data processed through the ${COMPANY.domain} website and its associated services.`,
];

const SECTIONS: LegalClause[] = [
  { h: "1. Who this policy applies to", body: [
    `This policy applies to visitors to the ${COMPANY.domain} website, people who contact us or subscribe to our communications, and clients and prospective clients who engage us for engineering or contracting work.`,
    "It does not govern third-party websites or services that have their own privacy notices; please review those separately.",
  ] },
  { h: "2. Personal data we collect", body: [
    "• Contact details: name, email address, phone number, company name, and any message you send through our contact or enquiry forms.",
    "• Project enquiry data: the location, type and stage of the work you ask us about, and any drawings, photographs or documents you choose to send us.",
    "• Account data (where an account is issued): name, email address, password (stored hashed), role, and preferences such as language.",
    "• Usage & technical data: pages viewed, approximate location derived from IP, and device/browser type, collected through privacy-friendly first-party analytics without advertising cookies.",
    "• Communications: your enquiries, support requests, and correspondence with us.",
    "We do not intentionally collect special categories of data (e.g. health, religion, biometrics). Please do not submit such data to us.",
  ] },
  { h: "3. How and why we use your data (purposes & legal bases)", body: [
    "• To respond to enquiries, prepare proposals and deliver the engineering or contracting services you request — performance of a contract and our legitimate interests in assisting you.",
    "• To operate, secure, debug, and improve the website and services — our legitimate interests in running a safe, reliable service.",
    "• To send service and transactional communications — performance of a contract; to send optional updates — your consent, which you may withdraw at any time.",
    "• To meet professional, record-keeping and tax obligations that apply to an engineering practice — legal obligation.",
    "• To detect, prevent, and investigate fraud, abuse, or security incidents — legal obligation and legitimate interests.",
  ] },
  { h: "4. Sharing & disclosure", body: [
    "We do not sell your personal data. We share it only as needed and under appropriate safeguards with:",
    "• Service providers (processors) acting on our instructions — including cloud hosting, infrastructure, and email delivery. These providers are bound by contract to protect your data and use it only to provide their services to us.",
    "• Authorities and licensing bodies — where a permit, approval or professional submission requires it, and only the data that submission requires.",
    "• Contractors, subcontractors and consultants working on your project — where the work cannot be delivered without it.",
    "• Professional advisers, auditors, and authorities — where required by law, regulation, legal process, or to protect our rights, clients, or the public.",
    "• Successors — in connection with a merger, acquisition, or asset sale, subject to this policy.",
  ] },
  { h: "5. International transfers", body: [
    "We work in Example Country and on projects in Region Two and Region Three, so personal data may be transferred outside Example Country. Where it is, we rely on lawful transfer mechanisms under national data protection law to ensure your data remains protected.",
  ] },
  { h: "6. Data retention", body: [
    "We keep personal data only for as long as necessary for the purposes set out above: for the life of your relationship with us and a reasonable period afterwards, and longer where required to meet legal, tax, professional record-keeping, or dispute-resolution obligations. Project records in particular are kept for the period a claim could still be brought on the work. When data is no longer needed, we delete or irreversibly anonymise it.",
  ] },
  { h: "7. Your rights", body: [
    "Subject to applicable law, you have the right to: access your data; rectify inaccurate data; erase data; restrict or object to processing; data portability; and withdraw consent at any time where processing is based on consent.",
    `To exercise any right, email us at ${COMPANY.email}. We will respond within the timeframe required by law. You also have the right to lodge a complaint with the competent national supervisory authority.`,
  ] },
  { h: "8. Cookies & similar technologies", body: [
    "We use strictly necessary cookies to keep you signed in and remember your language, and privacy-friendly first-party analytics that do not use advertising cookies or track you across other sites. You can control cookies through your browser settings; disabling necessary cookies may affect core functionality.",
  ] },
  { h: "9. Security", body: [
    "We apply technical and organisational measures appropriate to the risk — including encryption in transit (TLS), hashing of passwords, access controls, and isolation of sensitive operations. No method of transmission or storage is completely secure, but we work to protect your data and to notify you and the relevant authorities of any breach as required by law.",
  ] },
  { h: "10. Children", body: [
    "Our website and services are intended for businesses and adults. They are not directed to children, and we do not knowingly collect data from anyone under 18. If you believe a child has provided us data, contact us and we will delete it.",
  ] },
  { h: "11. Changes to this policy", body: [
    "We may update this policy to reflect changes in our practices or the law. We will post the updated version here with a new \"last updated\" date and, where the changes are material, take reasonable steps to notify you.",
  ] },
  { h: "12. Contact us", body: [
    `For any privacy question or to exercise your rights, contact ${COMPANY.name} at ${COMPANY.email}, or by post to our office: ${REGISTRATION.registeredOffice}.`,
  ] },
];

export default async function PrivacyPage() {
  const locale = await getLocale();
  return <LegalDoc eyebrow="Legal" title="Privacy Policy" updated={UPDATED} intro={INTRO} sections={SECTIONS} locale={locale} />;
}
