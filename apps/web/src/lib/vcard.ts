import { COMPANY } from "./content";
import type { ResolvedPerson } from "./cards-store";

/**
 * vCard 3.0 builder for people added through /central/workforce.
 *
 * The two original cards ship as hand-made .vcf files with embedded photos and
 * legal blocks; those keep being served verbatim. This generator produces the
 * equivalent for anyone added later, so a new person is savable to a phone
 * without someone hand-authoring a file.
 */

/** vCard lines fold at 75 octets with a leading space on continuations. */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const out: string[] = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    out.push(" " + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  if (rest) out.push(" " + rest);
  return out.join("\r\n");
}

/** Escape the characters vCard treats as structural. */
const esc = (s: string) => String(s ?? "").replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");

const digits = (s: string) => s.replace(/\D/g, "");

export function buildVCard(p: ResolvedPerson, roleLabel: string): string {
  const primary = p.branches[0];
  const parts = p.name.trim().split(/\s+/);
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  const first = parts.length > 1 ? parts.slice(0, -1).join(" ") : p.name;

  const lines: string[] = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${esc(p.name)}`,
    `N:${esc(last)};${esc(first)};;;`,
    `TITLE:${esc(roleLabel)}`,
    // Primary branch names the legal entity this person contracts under.
    `ORG:${esc(COMPANY.name)}${primary ? ";" + esc(primary.legalName) : ""}`,
  ];

  for (const ph of p.phones) {
    const type = ph.key === "company" ? "TYPE=WORK,VOICE" : "TYPE=CELL,PREF";
    lines.push(`TEL;${type}:+${digits(ph.value)}`);
  }

  lines.push(`EMAIL;TYPE=WORK,PREF:${esc(p.email)}`);
  lines.push(`URL;TYPE=WORK:https://${COMPANY.domain}`);

  if (p.whatsapp?.display) {
    lines.push(`IMPP;X-SERVICE-TYPE=WhatsApp;TYPE=PREF:whatsapp:+${digits(p.whatsapp.display)}`);
  }
  if (p.linkedin) lines.push(`X-SOCIALPROFILE;TYPE=linkedin:${p.linkedin}`);

  // One address per branch the person belongs to, rather than a fixed office.
  for (const b of p.branches) {
    lines.push(
      `ADR;TYPE=WORK;LABEL=${esc(b.legalName)}:;;${esc(b.addressLine1)}${b.addressLine2 ? " " + esc(b.addressLine2) : ""};${esc(b.city)};${esc(b.region ?? "")};${esc(b.postalCode ?? "")};${esc(b.countryName)}`
    );
    const tag = b.slug.toUpperCase().replace(/[^A-Z0-9]/g, "");
    lines.push(`X-${tag}-COMPANY:${esc(b.legalName)}`);
    if (b.registrationNo) lines.push(`X-${tag}-${esc((b.registrationLabel || "REG").toUpperCase().replace(/[^A-Z0-9]/g, ""))}:${esc(b.registrationNo)}`);
    if (b.taxNo) lines.push(`X-${tag}-${esc((b.taxLabel || "TAX").toUpperCase().replace(/[^A-Z0-9]/g, ""))}:${esc(b.taxNo)}`);
    if (b.authority) lines.push(`X-${tag}-AUTHORITY:${esc(b.authority)}`);
  }

  const where = p.branches.length ? p.branches.map((b) => `${b.city}, ${b.countryName}`).join(" · ") : p.location;
  lines.push(`NOTE:${esc(`${roleLabel} at ${COMPANY.name} — ${where}.`)}`);
  lines.push("END:VCARD");

  return lines.map(fold).join("\r\n") + "\r\n";
}
