import { COMPANY, LEADERSHIP } from "./content";

export type PhoneKey = "primaryMobile" | "secondaryMobile" | "company";
export type RoleKey = "founder" | "ops" | "chairman";

export type CardPerson = {
  slug: string;
  name: string;
  role: RoleKey;
  /** Empty when no photograph has been supplied — the card renders initials. */
  photo: string;
  qr: string;
  vcf: string;
  email: string;
  /**
   * Ordered phone list — the first is the primary. `key` drives the icon and the
   * translated preset label; `label` overrides it for numbers from any other
   * country, so the list is not limited to the presets.
   */
  phones: { key: PhoneKey; label?: string; value: string; href: string }[];
  whatsapp: { display: string; href: string };
  linkedin?: string;
  location: string;
};

/**
 * The built-in card list. One person: the only name the supplied business card
 * prints. Anyone else is added at /central/workforce rather than invented here.
 *
 * The portrait is the photograph the office supplied, cropped square so the
 * circular avatar does not cut the head. It is a real photograph of the named
 * engineer — the component still falls back to initials for anyone added later
 * without one, because a stock face standing in for a real person is the one
 * thing on a business card a recipient cannot check.
 */
export const CARD_PEOPLE: CardPerson[] = [
  {
    slug: "founder",
    name: LEADERSHIP[0].name,
    role: "founder",
    photo: "/img/team/placeholder.png",
    // No hand-made asset: the QR and vCard are generated on demand from the
    // card routes, exactly like a person added later through /central/workforce.
    qr: "/api/cards/founder/qr",
    vcf: "/api/cards/founder/vcf",
    email: COMPANY.emails.engineering,
    phones: [
      { key: "primaryMobile", value: COMPANY.phones[0], href: `tel:${COMPANY.phones[0]}` },
      { key: "secondaryMobile", value: COMPANY.phones[1], href: `tel:${COMPANY.phones[1]}` },
    ],
    whatsapp: { display: COMPANY.whatsapp, href: `https://wa.me/${COMPANY.whatsapp.replace(/\D/g, "")}` },
    linkedin: LEADERSHIP[0].publicProfile,
    location: `${COMPANY.foundedCity}, ${COMPANY.country}`,
  },
];

export function getPerson(slug: string) {
  return CARD_PEOPLE.find((p) => p.slug === slug);
}
