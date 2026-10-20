import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY, OFFICES } from "@/lib/content";
import { getLocale } from "@/lib/i18n.server";
import { ContactForm } from "@/components/ContactForm";
import { IconCard, IconMail, IconPhone, IconPin } from "@/components/brand/icons";
import { t as pick, type Bi } from "@/lib/brand-content";

export const metadata: Metadata = {
  title: "Contact",
  description: `Get in touch with ${COMPANY.name}.`,
};

const UI = {
  eyebrow: { ar: "تواصل معنا", en: "Get in touch", es: "Contáctenos", pt: "Fale connosco", fr: "Nous contacter" } as Bi,
  title: { ar: "نتطلع للتواصل معك", en: "We'd love to hear from you", es: "Nos encantaría saber de usted", pt: "Teremos todo o gosto em ouvi-lo", fr: "Nous serions ravis de vous lire" } as Bi,
  subtitle: {
    ar: "تصميم، أو مكتب فني، أو ترخيص، أو تنفيذ وإشراف — أخبرنا بالمرحلة التي أنت فيها ونرد عليك.",
    en: "Design, technical office, a permit, or execution and supervision — tell us which stage you are at and we will come back to you.", es: "Diseño, oficina técnica, una licencia o ejecución y supervisión: díganos en qué fase está y le responderemos.", pt: "Projeto, escritório técnico, uma licença ou execução e fiscalização — diga-nos em que fase está e respondemos.", fr: "Conception, bureau technique, un permis, ou exécution et supervision — dites-nous à quelle étape vous êtes et nous revenons vers vous.",
  } as Bi,
  email: { ar: "البريد الإلكتروني", en: "Email", es: "Correo electrónico", pt: "E-mail", fr: "E-mail" } as Bi,
  phone: { ar: "الهاتف", en: "Phone", es: "Teléfono", pt: "Telefone", fr: "Téléphone" } as Bi,
  offices: { ar: "مكاتبنا", en: "Our offices", es: "Nuestras oficinas", pt: "Os nossos escritórios", fr: "Nos bureaux" } as Bi,
  approx: { ar: "العنوان التفصيلي عند الطلب", en: "Full street address on request", es: "Dirección completa a petición", pt: "Morada completa mediante pedido", fr: "Adresse complète sur demande" } as Bi,
  map: { ar: "عرض على خرائط جوجل", en: "View on Google Maps", es: "Ver en Google Maps", pt: "Ver no Google Maps", fr: "Voir sur Google Maps" } as Bi,
  digitalCard: { ar: "البطاقة الرقمية", en: "Digital business card", es: "Tarjeta de visita digital", pt: "Cartão de visita digital", fr: "Carte de visite numérique" } as Bi,
  fName: { ar: "الاسم", en: "Name", es: "Nombre", pt: "Nome", fr: "Nom" } as Bi,
  fEmail: { ar: "البريد الإلكتروني", en: "Email", es: "Correo electrónico", pt: "E-mail", fr: "E-mail" } as Bi,
  fCompany: { ar: "الشركة", en: "Company", es: "Empresa", pt: "Empresa", fr: "Société" } as Bi,
  fMsg: { ar: "الرسالة", en: "Message", es: "Mensaje", pt: "Mensagem", fr: "Message" } as Bi,
  send: { ar: "إرسال الرسالة", en: "Send message", es: "Enviar mensaje", pt: "Enviar mensagem", fr: "Envoyer le message" } as Bi,
  sending: { ar: "جارٍ الإرسال…", en: "Sending…", es: "Enviando…", pt: "A enviar…", fr: "Envoi…" } as Bi,
  thanks: { ar: "شكرًا لك!", en: "Thank you!", es: "¡Gracias!", pt: "Obrigado!", fr: "Merci !" } as Bi,
  thanksBody: { ar: "لقد استلمنا رسالتك وسنتواصل معك قريبًا.", en: "We've received your message and will be in touch shortly.", es: "Hemos recibido su mensaje y le responderemos en breve.", pt: "Recebemos a sua mensagem e entraremos em contacto em breve.", fr: "Nous avons bien reçu votre message et vous répondrons sous peu." } as Bi,
  error: { ar: "حدث خطأ ما. يرجى مراسلتنا مباشرة.", en: "Something went wrong. Please email us directly.", es: "Algo salió mal. Escríbanos directamente por correo.", pt: "Algo correu mal. Escreva-nos diretamente por e-mail.", fr: "Une erreur est survenue. Écrivez-nous directement par e-mail." } as Bi,
};

/**
 * One maps link per office. Only the locality is known — the research pack
 * flags the exact street addresses as needing confirmation — so the query is
 * the locality, and the card says so rather than dropping a pin on a street
 * nobody has verified.
 */
const mapsUrl = (q: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

export default async function ContactPage() {
  const locale = await getLocale();
  // Every UI string on this page is translated into all five locales;
  // an ar/en ternary here silently served English to three of them.
  const p = (v: Bi) => pick(v, locale);

  const form = {
    fName: p(UI.fName),
    fEmail: p(UI.fEmail),
    fCompany: p(UI.fCompany),
    fMsg: p(UI.fMsg),
    send: p(UI.send),
    sending: p(UI.sending),
    thanks: p(UI.thanks),
    thanksBody: p(UI.thanksBody),
    error: p(UI.error),
  };

  return (
    <section className="mx-auto max-w-6xl px-5 py-16 md:py-24 grid gap-12 md:grid-cols-2">
      <div>
        <div className="text-xs font-bold tracking-widest uppercase app-gradient-text mb-3">{p(UI.eyebrow)}</div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">{p(UI.title)}</h1>
        <p className="text-[color:var(--ink)]/60 mt-4 max-w-md">{p(UI.subtitle)}</p>
        <div className="mt-8 space-y-5 text-sm">
          <div className="flex items-start gap-3">
            <IconMail className="mt-1.5 size-5 shrink-0 text-[color:var(--accent)]" />
            <div>
              <div className="text-[color:var(--ink)]/55 uppercase text-xs tracking-widest">{p(UI.email)}</div>
              <a
                href={`mailto:${COMPANY.email}`}
                className="inline-flex items-center min-h-11 text-lg hover:text-[color:var(--accent-text)]"
                dir="ltr"
              >
                {COMPANY.email}
              </a>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <IconPhone className="mt-1.5 size-5 shrink-0 text-[color:var(--accent)]" />
            <div>
              <div className="text-[color:var(--ink)]/55 uppercase text-xs tracking-widest">{p(UI.phone)}</div>
              {COMPANY.phones.map((ph) => (
                <a
                  key={ph}
                  href={`tel:${ph.replace(/[^+\d]/g, "")}`}
                  className="block min-h-11 text-lg hover:text-[color:var(--accent-text)]"
                  dir="ltr"
                >
                  {ph}
                </a>
              ))}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <IconPin className="mt-1.5 size-5 shrink-0 text-[color:var(--accent)]" />
            <div>
              <div className="text-[color:var(--ink)]/55 uppercase text-xs tracking-widest">{p(UI.offices)}</div>
              {OFFICES.map((o) => {
                const place = `${locale === "ar" ? o.cityAr : o.city}, ${o.countryName}`;
                return (
                  <div key={o.slug} className="mt-2 first:mt-1">
                    <div className="text-base leading-relaxed">
                      <span className="me-1.5" aria-hidden="true">{o.flag}</span>
                      <span className="font-semibold">{p(o.roleLoc)}</span>
                      {" — "}
                      {o.areaLoc ? p(o.areaLoc) : locale === "ar" ? o.cityAr : o.city}
                    </div>
                    {!o.addressIsComplete && (
                      <div className="text-xs text-[color:var(--ink)]/45">{p(UI.approx)}</div>
                    )}
                    <a
                      href={mapsUrl(place)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center min-h-11 text-sm text-[color:var(--accent-text)] hover:underline"
                    >
                      {p(UI.map)} ↗
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
          <Link
            href="/cards"
            className="inline-flex items-center gap-2 text-sm font-bold text-[color:var(--accent-text)] hover:underline"
          >
            <IconCard className="size-4" />
            {p(UI.digitalCard)}
          </Link>
        </div>
      </div>

      <div className="panel rounded-2xl p-7">
        <ContactForm t={form} />
      </div>
    </section>
  );
}
