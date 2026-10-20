/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/Section";
import { resolvePeople } from "@/lib/cards-store";
import { getLocale } from "@/lib/i18n.server";
import { getMessages } from "@/lib/messages";
import { COMPANY } from "@/lib/content";
import { t as pick, type Bi } from "@/lib/brand-content";

/** The /cards description, in every locale rather than ar-or-English. */
const CARDS_META: Bi = {
  en: `Save an ${COMPANY.name} contact straight to your phone — open a card, scan the QR code, or download the vCard.`,
  ar: "احفظ جهة الاتصال مباشرة على هاتفك — افتح البطاقة أو امسح رمز QR أو نزّل ملف vCard.",
  es: `Guarde un contacto de ${COMPANY.name} directamente en su teléfono: abra una tarjeta, escanee el código QR o descargue la vCard.`,
  pt: `Guarde um contacto da ${COMPANY.name} diretamente no telemóvel — abra um cartão, digitalize o código QR ou transfira o vCard.`,
  fr: `Enregistrez un contact ${COMPANY.name} directement sur votre téléphone — ouvrez une carte, scannez le QR code ou téléchargez la vCard.`,
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = getMessages(locale).cards;
  return {
    title: t.title,
    description: pick(CARDS_META, locale),
  };
}

export const dynamic = "force-dynamic";

export default async function CardsPage() {
  const locale = await getLocale();
  const t = getMessages(locale).cards;
  // Editable in /central/workforce; falls back to the built-in CARD_PEOPLE list.
  const CARD_PEOPLE = await resolvePeople(locale);

  return (
    <Section id="cards" eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle}>
      <div className="grid gap-6 md:grid-cols-2">
        {CARD_PEOPLE.map((c) => (
          <Link
            key={c.slug}
            href={`/cards/${c.slug}`}
            className="panel rounded-2xl p-4 sm:p-6 flex items-center gap-4 sm:gap-5 hover:border-[color:var(--accent-text)]/40 transition group"
          >
            <img
              src={c.photo}
              alt={c.name}
              width={96}
              height={96}
              className="h-20 w-20 sm:h-24 sm:w-24 rounded-full object-cover shrink-0 ring-2 ring-[color:var(--hairline)]"
            />
            <div className="min-w-0">
              <h3 className="font-bold text-lg">{c.name}</h3>
              <p className="app-gradient-text text-sm font-semibold">{c.roleLabel || t.roles[c.role]}</p>
              <p className="text-[color:var(--ink)]/55 text-xs mt-1">{c.location}</p>
              <span className="inline-block mt-3 text-sm font-semibold text-[color:var(--ink)]/70 group-hover:text-[color:var(--ink)] transition">
                {t.openCard} →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </Section>
  );
}
