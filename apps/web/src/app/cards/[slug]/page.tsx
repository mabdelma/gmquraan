import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { resolvePerson } from "@/lib/cards-store";
import { BusinessCard } from "@/components/BusinessCard";
import { getLocale } from "@/lib/i18n.server";
import { getMessages } from "@/lib/messages";
import { COMPANY } from "@/lib/content";

// People are editable at runtime now, so the set of slugs is not build-time known.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const p = await resolvePerson(slug, locale);
  if (!p) return {};
  return {
    title: p.name,
    description:
      locale === "ar"
        ? `${p.name} — ${COMPANY.nameAr}. امسح رمز QR أو احفظ جهة الاتصال مباشرة على هاتفك.`
        : `${p.name} — ${COMPANY.name}. Scan the QR code or save the contact straight to your phone.`,
  };
}

export default async function PersonCardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getLocale();
  const person = await resolvePerson(slug, locale);
  if (!person) notFound();
  const t = getMessages(locale).cards;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-5 sm:py-14 flex flex-col items-center">
      <BusinessCard person={person} t={t} />
      <Link
        href="/cards"
        className="mt-8 text-sm text-[color:var(--ink)]/60 hover:text-[color:var(--ink)] transition"
      >
        ← {t.title}
      </Link>
    </div>
  );
}
