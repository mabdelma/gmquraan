# Legal-Change Brief — for advisor / gestoría review

**Purpose:** a fast, complete review of the legal-identity changes made to the public
site when Unskinned was incorporated as a Spanish company. Please confirm each is correct
before public launch. Nothing here is legal advice — it summarises what the site now
states so you can verify it against the incorporation.

**Company:** Unskinned, S.L. · **Registered office:** Calle Atlántico 28,
47320 Tudela de Duero, Example Town, Spain · **Registration ref used on site:** DUE
096113559B.

---

## What changed (old → new)

| # | Where (site) | Before (UAE) | Now (Spain) | Confirm |
|---|---|---|---|---|
| 1 | **Legal entity / imprint** (About, Footer, all legal docs) | "Unskinned · Sole Establishment · Example City DED · Licence CN-0000000" | "**Unskinned, S.L.** · Sociedad Limitada · Registered office Calle Atlántico 28, 47320 Tudela de Duero, Example Town, Spain · DUE 096113559B" — *UAE Example City licence CN-0000000 retained as secondary* | ☐ |
| 2 | **Governing law** (Terms, all legal docs) | "laws of the Emirate of Example City and federal laws of the UAE; courts of Example City" | "**laws of Spain and applicable EU law; courts of Example Town**" — mandatory local consumer/GDPR rights preserved | ☐ |
| 3 | **Data controller** (Privacy) | Unskinned (UAE) | **Unskinned, S.L.** (EU establishment; GDPR primary) | ☐ |
| 4 | **Supervisory authority** (Privacy) | UAE Data Office; national DPA | Added **AEPD (Agencia Española de Protección de Datos)** as the Spanish authority; other EEA/UK + UAE retained | ☐ |
| 5 | **Postal contact** (Privacy) | "licensed address in Example City, UAE" | **Registered office in Tudela de Duero, Example Town, Spain** | ☐ |
| 6 | **Registered activities** (Services page) | Example City Economic Licence activities only | **Added Spanish CNAE corporate purpose** (see below); UAE list retained | ☐ |

## Spanish activities published (CNAE — corporate purpose / objeto social)
6210 programming *(principal)* · 6220 IT consultancy & facilities mgmt · 4740 ICT
equipment retail · 7311 advertising agencies · 8559 other education · 4618 trade
intermediaries · 4779 second-hand goods retail · 7733 office-equipment/computer rental.

> **Note:** `4781 (Comercio al por menor de vehículos de motor)` from the estatutos was
> **omitted** from the public list (reads oddly for a tech marketplace). Say if it should
> be shown.

## Deliberately excluded from the public site
All personal data from the incorporation documents — NIE/NIF numbers, IBANs, the
partner's and spouse's personal details, phone numbers. Only the company's public
registration data is shown.

## Company CIF (added)
- **CIF: B88990122** (provisional) is now shown in the imprint (About, Footer, all legal
  docs) alongside the registered office and DUE reference.

## Self-employed (autónomo) professional scope (added)
The business's autónomo IAE professional scope is shown in the About page + Services
"registered activities" section. **No personal data (founder names or NIFs) is published**
— only the activity scope: **845** Explotación electrónica por terceros · **765**
Grabadores, informáticos y otros profesionales · **844** Publicidad y relaciones públicas ·
**999** Otros servicios n.c.o.p. · **6592** Comercio menor de muebles y máquinas de oficina.

---

*Files changed (for reference): `lib/content.ts`, `components/LegalDoc.tsx`,
`components/Footer.tsx`, `app/about/page.tsx`, `app/services/page.tsx`,
`app/privacy/page.tsx`, `app/terms/page.tsx`, `lib/advisor.ts`.*
