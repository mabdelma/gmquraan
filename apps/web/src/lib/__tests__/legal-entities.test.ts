import { describe, expect, it } from "vitest";
import { COMPANY, LEADERSHIP, LEGAL_ENTITIES, REGISTRATION } from "../content";
import { CONTACT_DEFAULTS } from "../settings";
import { LICENCE_ACTIVITIES, LICENCE_ENTITIES, activitiesByEntity, type LicenceEntity } from "../licence-activities";

/**
 * The association publishes exactly one identifier — its registration number,
 * lettered onto the emblem itself: المشهرة برقم ٢٢٤ لسنة ١٩٧٧. Every other
 * number (tax, licence, professional body) has never appeared on its site.
 *
 * These tests pin that split, because the thing that actually goes wrong is a
 * plausible-looking identifier getting typed in from memory during a later edit
 * with nobody able to tell it was never on a document.
 *
 * When a certificate does arrive, the right change is to put the number in
 * content.ts and swap the matching assertion here for the value — deliberately,
 * in the same commit.
 */
describe("registration identifiers are absent until a document supplies them", () => {
  it("publishes the one number the association itself prints, and no other", () => {
    // Read off the emblem, so it is carried.
    expect(REGISTRATION.registerNo).toBe("224 / 1977");
    // Never published anywhere by the association.
    expect(REGISTRATION.taxNo).toBeNull();
    expect(REGISTRATION.licenceNo).toBeNull();
    // No professional-body registration applies to a community association.
    expect(REGISTRATION.syndicateNo).toBeNull();
  });

  it("publishes no issue or expiry date either", () => {
    // With no licence on file there is no validity period, so the licence page
    // must render no status badge rather than an undefined one.
    expect(REGISTRATION.issued).toBeNull();
    expect(REGISTRATION.expires).toBeNull();
  });

  it("has one wording for the missing-number state, in both scripts", () => {
    expect(REGISTRATION.pending).toBeTruthy();
    expect(REGISTRATION.pendingAr).toBeTruthy();
  });
});

describe("the displayed brand name", () => {
  it("keeps COMPANY.name and REGISTRATION.legalName in lockstep", () => {
    expect(COMPANY.name).toBe(REGISTRATION.legalName);
    expect(COMPANY.name).toBe("Association for the Preservation of the Holy Qur'an");
  });

  it("carries the legal form in REGISTRATION.legalForm rather than in the name", () => {
    // "Association" in the name is part of the proper name, not the legal form.
    // The legal form is the "registered community association" standing, and
    // that belongs in its own field so the name never reads as a claim of it.
    expect(REGISTRATION.legalForm).toContain("community association");
    expect(REGISTRATION.legalName).not.toContain("Registered community");
  });

  it("splits the wordmark without dropping a letter", () => {
    // Deriving the tail from shortName's length is how a two-word name ends up
    // rendered with a repeated syllable; these two fields exist to stop that.
    expect(`${COMPANY.wordmarkLead} ${COMPANY.wordmarkRest}`).toBe(COMPANY.name);
  });

  it("splits the Arabic wordmark without dropping a letter", () => {
    // The nav and footer render the Arabic name as the same two-tone lockup;
    // this pins the split so it cannot drift from nameAr either.
    expect(`${COMPANY.wordmarkLeadAr} ${COMPANY.wordmarkRestAr}`).toBe(COMPANY.nameAr);
  });
});

describe("contact details are on the gmquran.com domain", () => {
  it("routes every desk to the one mailbox the association actually publishes", () => {
    // The association publishes info@gmquran.com and nothing else. Splitting
    // the desks into contact@/projects@/admin@ would read as four routes and
    // bounce on three, so every key deliberately resolves to the same address.
    // When real mailboxes exist, split them here and this test with them.
    for (const [key, address] of Object.entries(COMPANY.emails)) {
      expect(address, key).toBe(`info@${COMPANY.domain}`);
    }
    expect(COMPANY.email).toBe(COMPANY.emails.info);
  });

  it("keeps the mailbox out of the legal and leadership blocks", () => {
    // Those blocks carry standing and identity, not contact routes; an address
    // appearing there is a sign something was copied in from the contact page.
    const rendered = JSON.stringify([LEGAL_ENTITIES, LEADERSHIP, LICENCE_ACTIVITIES]);
    expect(rendered).not.toContain(COMPANY.email);
  });

  it("stores every number in full international form", () => {
    // A local-form Egyptian number (01020048168) is undiallable from abroad,
    // and prepending the dial code at each call site is how `tel:+20+20...`
    // gets shipped. One mobile (10 digits after +20) and two Assiut landlines
    // on area code 88 (9 digits).
    for (const ph of COMPANY.phones) {
      expect(ph, ph).toMatch(/^\+20\d{9,10}$/);
    }
    expect(COMPANY.primaryPhone).toBe(COMPANY.phones[0]);
    expect(COMPANY.whatsapp).toBe(COMPANY.primaryPhone);
  });

  it("points WhatsApp at the mobile line, which is the only one that can carry it", () => {
    // The two landlines cannot run WhatsApp at all, so this must stay the
    // mobile even if the landlines are listed first somewhere later.
    expect(CONTACT_DEFAULTS.whatsapp).toBe(COMPANY.whatsapp.replace(/\D/g, ""));
    expect(CONTACT_DEFAULTS.whatsapp).toBe("201020048168");
  });
});

describe("public legal block", () => {
  it("carries the one operating entity", () => {
    expect(LEGAL_ENTITIES.map((e) => e.name)).toEqual([REGISTRATION.legalName]);
  });

  it("marks the office as a confirmed address", () => {
    // Unlike the template this was built from, the association publishes a
    // full street address rather than a district, so the block may print it
    // as the registered office.
    const eg = LEGAL_ENTITIES[0];
    expect(eg.office).toContain("Sahel Selim");
    expect(eg.officeIsRegistered).toBe(true);
  });

  it("renders the registration number and leaves the rest as labels", () => {
    const byLabel = Object.fromEntries(LEGAL_ENTITIES[0].refs.map((r) => [r.label, r.value]));
    expect(byLabel.register).toBe("224 / 1977");
    expect(byLabel.tax).toBeNull();
    expect(byLabel.licence).toBeNull();
  });

  it("keeps person identifiers and unverified claims out of the leadership data", () => {
    // Nothing on the business card is a national ID or a shareholding, and
    // nothing invented may creep in beside the name and role.
    const rendered = JSON.stringify(LEADERSHIP);
    for (const n of ["100.00", "%"]) {
      expect(rendered).not.toContain(n);
    }
  });
});

describe("activities", () => {
  const entities = Object.keys(LICENCE_ENTITIES) as LicenceEntity[];

  it("every entity has activities to render", () => {
    for (const e of entities) expect(activitiesByEntity(e).length).toBeGreaterThan(0);
  });

  it("every activity belongs to a known entity", () => {
    for (const a of LICENCE_ACTIVITIES) expect(entities).toContain(a.entity);
  });

  it("slugs are unique", () => {
    const slugs = LICENCE_ACTIVITIES.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("counts in the entity subtitles match the actual lists", () => {
    for (const e of entities) {
      const n = activitiesByEntity(e).length;
      expect(LICENCE_ENTITIES[e].sub).toMatch(new RegExp(`\\b${n}\\b`));
    }
  });

  it("claims no invented activity codes", () => {
    // No licence document has been supplied, so there is no code column to
    // transcribe from and nothing may be put in that field.
    for (const a of LICENCE_ACTIVITIES) expect(a.code, a.slug).toBeFalsy();
  });

  it("names no client and no project anywhere in the activity copy", () => {
    // The research pack rules both out without documentary evidence, and
    // `opportunities` is the field most likely to attract one.
    const rendered = JSON.stringify(LICENCE_ACTIVITIES).toLowerCase();
    for (const banned of ["pulsa", "sasco", "client:", "for our client"]) {
      expect(rendered, banned).not.toContain(banned);
    }
  });
});
