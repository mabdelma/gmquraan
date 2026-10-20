"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { BrandLogo } from "./BrandLogo";
import type { CardPerson } from "@/lib/cards";
import { COMPANY, REGISTRATION } from "@/lib/content";

/** People added via /central/workforce carry a free-text role instead of a preset key. */
type CardBranch = {
  slug: string;
  flag: string | null;
  legalName: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  region: string | null;
  postalCode: string | null;
  countryName: string;
};
type CardPersonWithRole = CardPerson & { roleLabel?: string; branches?: CardBranch[] };

/** One-line postal address, skipping the parts a branch does not have. */
const branchAddress = (b: CardBranch) =>
  [b.addressLine1, b.addressLine2, b.postalCode ? `${b.postalCode} ${b.city}` : b.city, b.region, b.countryName]
    .filter(Boolean)
    .join(", ");

export type CardMessages = {
  roles: { founder: string; ops: string; chairman: string };
  contact: string;
  connect: string;
  location: string;
  primaryMobile: string;
  secondaryMobile: string;
  company: string;
  save: string;
  viewBack: string;
  viewFront: string;
  scanHint: string;
  pdf: string;
};

// The card's small tracking line under the mark. Built from COMPANY rather
// than typed out, so a rename lands here too.
const TAGLINE = [COMPANY.name, COMPANY.foundedCity, COMPANY.country]
  .join(" · ")
  .toUpperCase();

/**
 * Initials, for the people with no supplied photograph. A card is the one
 * surface where a stock face would be read as the person's own, so there is no
 * placeholder portrait anywhere in this component — just their letters.
 */
const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

function Portrait({ name, photo, size }: { name: string; photo: string; size: number }) {
  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="contact-photo rounded-full object-cover ring-4 ring-[color:var(--accent-text)]/40"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }}
      className="app-gradient flex items-center justify-center rounded-full font-extrabold text-[color:var(--on-accent)] ring-4 ring-[color:var(--accent-text)]/40"
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full text-[7px] font-bold tracking-[2.5px] text-[color:var(--ink)]/45 mb-1">
      {children}
    </div>
  );
}

function Row({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-xs text-[color:var(--ink)]/85">
      <span className="w-5 shrink-0 text-center text-[13px]" aria-hidden>{icon}</span>
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}

export function BusinessCard({ person, t }: { person: CardPersonWithRole; t: CardMessages }) {
  const [flipped, setFlipped] = useState(false);
  const role = person.roleLabel || t.roles[person.role];

  // One QR definition used by both faces so they can never drift apart.
  // The back copy is decorative: both faces are in the DOM at once, so without
  // this a screen reader would announce the same code twice.
  const Qr = ({ decorative }: { decorative?: boolean }) => (
    <div className="mt-5 flex flex-col items-center">
      <div className="rounded-xl bg-white p-3 ring-1 ring-[color:var(--accent-text)]/30">
        <img
          src={person.qr}
          alt={decorative ? "" : `QR — ${person.name}`}
          aria-hidden={decorative || undefined}
          width={152}
          height={152}
          className="h-[136px] w-[136px] sm:h-[152px] sm:w-[152px]"
        />
      </div>
      <div className="mt-2 text-[7px] font-bold tracking-[1.6px] text-[color:var(--ink)]/50">
        {t.scanHint.toUpperCase()}
      </div>
    </div>
  );

  // Save Contact is a plain download of the prebuilt .vcf — it already carries
  // the official portrait, so no JavaScript is involved.
  const Actions = ({ back }: { back?: boolean }) => (
    <div className="app-card-actions mt-5 flex w-full flex-col gap-2">
      <a
        href={person.vcf}
        download
        className="app-gradient flex min-h-11 w-full items-center justify-center rounded-xl px-3 text-center text-xs font-bold text-[color:var(--on-accent)] transition hover:opacity-90"
      >
        💾 {t.save}
      </a>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          className="flex min-h-11 flex-1 items-center justify-center rounded-xl border border-[color:var(--hairline)] px-2 text-xs font-bold transition hover:bg-[color:var(--overlay)]"
        >
          📄 {t.pdf}
        </button>
        <button
          type="button"
          onClick={() => setFlipped(!back)}
          className="flex min-h-11 flex-1 items-center justify-center rounded-xl border border-[color:var(--hairline)] px-2 text-xs font-bold transition hover:bg-[color:var(--overlay)]"
        >
          ↻ {back ? t.viewFront : t.viewBack}
        </button>
      </div>
    </div>
  );

  return (
    <div className="app-card-scene">
      <div className={`app-card-wrap${flipped ? " is-flipped" : ""}`}>
        {/* ---------- FRONT ---------- */}
        <div className="app-card-face app-card-front panel rounded-3xl px-4 py-6 sm:px-6 sm:py-7 flex flex-col items-center">
          <BrandLogo h={64} alt="" />
          <div className="mt-2 text-[7px] font-semibold tracking-[3px] text-[color:var(--ink)]/45">{TAGLINE}</div>
          <div className="app-card-div my-4" />

          <Portrait name={person.name} photo={person.photo} size={140} />

          <h1 className="mt-4 text-xl font-extrabold text-center">{person.name}</h1>
          <p className="app-gradient-text text-sm font-semibold text-center">{role}</p>
          <div className="app-card-div my-4" />

          <div className="w-full flex flex-col gap-2">
            <Label>{t.contact}</Label>
            {person.phones.map((p, i) => (
              // Keyed by index: two slots may share a preset now that any
              // country is allowed, so p.key is no longer unique.
              <Row key={`${p.key}-${i}`} icon={p.key === "company" ? "🏢" : "📱"}>
                {p.label || t[p.key]}: <a href={p.href} className="font-semibold">{p.value}</a>
              </Row>
            ))}
            <Row icon="✉️"><a href={`mailto:${person.email}`}>{person.email}</a></Row>
            <Row icon="🌐">
              <a href={`https://${COMPANY.domain}`} target="_blank" rel="noopener">{COMPANY.domain}</a>
            </Row>

            <Label>{t.connect}</Label>
            <Row icon="💬">
              <a href={person.whatsapp.href} target="_blank" rel="noopener">WhatsApp ({person.whatsapp.display})</a>
            </Row>
            {person.linkedin && (
              <Row icon="👤">
                <a href={person.linkedin} target="_blank" rel="noopener">{person.name} on LinkedIn</a>
              </Row>
            )}
            {/* The group's own social accounts are not set up yet; a card that
                links to the previous company's LinkedIn is worse than a card
                that links to nothing. Restore these rows once the handles
                exist. */}

            <Label>{t.location}</Label>
            {person.branches?.length ? (
              // Address comes from the branches this person belongs to, configured
              // at /central/branches — not from a hardcoded office.
              person.branches.map((b) => (
                <Row key={b.slug} icon={b.flag || "📍"}>
                  <span className="font-semibold">{b.legalName}</span>
                  <br />
                  <span className="opacity-75">{branchAddress(b)}</span>
                </Row>
              ))
            ) : (
              <Row icon="📍">{person.location}</Row>
            )}
          </div>

          <Qr />

          <Actions />
        </div>

        {/* ---------- BACK ---------- */}
        <div className="app-card-face app-card-back panel rounded-3xl px-4 py-6 sm:px-7 sm:py-9 flex flex-col items-center justify-center text-center">
          <BrandLogo h={76} alt="" />
          <div className="mt-4">
            <Portrait name={person.name} photo={person.photo} size={84} />
          </div>
          <div className="app-card-div my-5" />
          <p className="text-[15px] font-extrabold leading-tight">{COMPANY.name}</p>
          <p className="app-gradient-text mt-2 text-[16px] font-bold leading-snug">{COMPANY.tagline}</p>
          <div className="mt-7 text-[6.5px] font-semibold tracking-[4px] text-[color:var(--ink)]/45">{TAGLINE}</div>
          <a
            href={`https://${COMPANY.domain}`}
            target="_blank"
            rel="noopener"
            className="mt-5 text-[10.5px] text-[color:var(--ink)]/60"
          >
            {COMPANY.domain}
          </a>

          <Qr decorative />

          <div className="mt-6 w-full rounded-xl border border-[color:var(--hairline)] p-3 text-[7px] leading-relaxed text-[color:var(--ink)]/60">
            <div className="font-bold text-[color:var(--ink)]/80">© {new Date().getFullYear()} {COMPANY.name}</div>
            {/* No registration number: none has been supplied, and a card is the
                last place to print a reference nobody has read off a
                document. The authority and form carry the standing. */}
            <div className="mt-1">🇪🇬 {REGISTRATION.legalName} · {REGISTRATION.legalForm}</div>
          </div>

          <Actions back />
        </div>
      </div>
    </div>
  );
}
