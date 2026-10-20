import { describe, expect, it } from "vitest";
import {
  INACTIVITY_DAYS,
  STAGE_PROBABILITY,
  STAGE_TRANSITIONS,
  customerRef,
  dedupeCustomer,
  inactivityBreach,
  isBackwardTransition,
  missingStageFields,
  normaliseCompanyName,
  opportunityRef,
  stageMove,
} from "../index.js";

const commercial = {
  estimatedValue: 25000,
  currency: "EUR",
  expectedCloseDate: "2026-12-01",
  probability: 40,
};

describe("stage transitions", () => {
  it("follows the declared graph", () => {
    expect(stageMove("new", "contacted", {}).ok).toBe(true);
    expect(stageMove("negotiation", "won", { ...commercial, closedAt: new Date(), handoverOwnerId: "m1" }).ok).toBe(true);
  });

  it("refuses a jump the workflow does not declare", () => {
    const v = stageMove("new", "won", commercial);
    expect(v.ok).toBe(false);
    expect(v.ok === false && v.reason).toMatch(/can only move to/);
  });

  it("treats won as final", () => {
    expect(STAGE_TRANSITIONS.won).toEqual([]);
    const v = stageMove("won", "negotiation", commercial);
    expect(v.ok === false && v.reason).toMatch(/final/);
  });

  it("allows a lost opportunity to be reopened, but says who must approve", () => {
    const v = stageMove("lost", "qualified", commercial);
    expect(v.ok).toBe(true);
    expect(v.ok === true && v.needsApproval).toBe("sales_manager");
  });

  it("needs a reason to move backwards", () => {
    expect(isBackwardTransition("proposal", "qualified")).toBe(true);
    expect(stageMove("proposal", "qualified", commercial).ok).toBe(false);
    expect(stageMove("proposal", "qualified", { ...commercial, reason: "Scope withdrawn" }).ok).toBe(true);
  });

  it("does not treat on hold or lost as backwards", () => {
    // Parking something is sideways, not a regression, and it has its own
    // required fields instead.
    expect(isBackwardTransition("proposal", "on_hold")).toBe(false);
    expect(isBackwardTransition("negotiation", "lost")).toBe(false);
  });

  it("carries the declared default probability when none is given", () => {
    const v = stageMove("new", "contacted", {});
    expect(v.ok === true && v.probability).toBe(STAGE_PROBABILITY.contacted);
  });
});

describe("required fields", () => {
  it("demands value, currency, close date and probability from qualified", () => {
    // BUSINESS_RULES.md says "from Qualified onward"; the workflow file only
    // lists them from proposal. Policy outranks workflow, so qualified it is.
    const missing = missingStageFields("qualified", {});
    expect(missing).toContain("estimated value");
    expect(missing).toContain("currency");
    expect(missing).toContain("expected close date");
    expect(missing).toContain("probability");
  });

  it("demands a hold reason and a follow-up date on hold", () => {
    expect(missingStageFields("on_hold", {})).toEqual(["hold reason", "follow-up date"]);
  });

  it("demands a lost reason", () => {
    expect(missingStageFields("lost", { closedAt: new Date() })).toEqual(["lost reason"]);
  });

  it("demands a named delivery handover owner on won", () => {
    // A won deal nobody owns for delivery is how a sale becomes a problem
    // three weeks later.
    const missing = missingStageFields("won", { ...commercial, closedAt: new Date() });
    expect(missing).toEqual(["delivery handover owner"]);
  });

  it("asks nothing extra of the early stages", () => {
    expect(missingStageFields("new", {})).toEqual([]);
    expect(missingStageFields("contacted", {})).toEqual([]);
  });
});

describe("deduplication", () => {
  const existing = [
    {
      id: "c1",
      displayName: "Iberia Logistics S.L.",
      taxId: "B-12345678",
      websiteDomain: "https://www.iberialogistics.es/about",
      primaryEmail: "hello@iberialogistics.es",
      primaryPhone: "+1 555 555 0108",
    },
    { id: "c2", displayName: "Nordwind GmbH", taxId: "DE998877" },
  ];

  it("blocks outright on a matching tax identifier", () => {
    // The same legal entity cannot be two customers.
    const r = dedupeCustomer({ displayName: "Iberia Logistics", taxId: "b12345678" }, existing);
    expect(r.decision).toBe("block_create_and_link_existing");
    expect(r.decision === "block_create_and_link_existing" && r.matchId).toBe("c1");
  });

  it("asks for review on a matching domain, not a block", () => {
    const r = dedupeCustomer({ displayName: "Something Else", websiteDomain: "iberialogistics.es" }, existing);
    expect(r.decision).toBe("request_review");
  });

  it("asks for review when a name normalises to the same thing", () => {
    // Suffixes and punctuation removed: "Iberia Logistics SL" is the same name.
    const r = dedupeCustomer({ displayName: "IBERIA LOGISTICS, S.L." }, existing);
    expect(r.decision).toBe("request_review");
  });

  it("matches a phone number regardless of formatting", () => {
    const r = dedupeCustomer({ displayName: "Zed Ltd", primaryPhone: "0015555550108" }, existing);
    expect(r.decision).toBe("request_review");
  });

  it("does not treat a free-mail domain as evidence", () => {
    // Two customers both using gmail is not a reason to suspect they are one.
    const withGmail = [{ id: "c3", displayName: "A", websiteDomain: "gmail.com" }];
    const r = dedupeCustomer({ displayName: "Totally Different", primaryEmail: "someone@gmail.com" }, withGmail);
    expect(r.decision).toBe("allow_create");
  });

  it("allows a genuinely new customer through", () => {
    expect(dedupeCustomer({ displayName: "Brand New Co", taxId: "X-999" }, existing).decision).toBe("allow_create");
  });

  it("reports each candidate once even when several signals match", () => {
    const r = dedupeCustomer(
      {
        displayName: "Iberia Logistics S.L.",
        websiteDomain: "iberialogistics.es",
        primaryPhone: "+1 555 555 0108",
      },
      existing
    );
    expect(r.decision).toBe("request_review");
    expect(r.decision === "request_review" && r.candidates).toHaveLength(1);
  });

  it("strips company suffixes when comparing names", () => {
    expect(normaliseCompanyName("Iberia Logistics S.L.")).toBe(normaliseCompanyName("IBERIA LOGISTICS LIMITED"));
  });
});

describe("inactivity", () => {
  const now = new Date("2026-08-11T12:00:00Z");
  const days = (n: number) => new Date(now.getTime() - n * 86_400_000);

  it("stays quiet inside the limit", () => {
    expect(
      inactivityBreach({ stage: "contacted", lastActivityAt: days(1), stageEnteredAt: days(1) }, now).breached
    ).toBe(false);
  });

  it("breaches past the declared limit for the stage", () => {
    const v = inactivityBreach({ stage: "contacted", lastActivityAt: days(5), stageEnteredAt: days(5) }, now);
    expect(v.breached).toBe(true);
    expect(v.breached === true && v.days).toBe(5);
    expect(INACTIVITY_DAYS.contacted).toBe(3);
  });

  it("measures from stage entry when there has been no activity at all", () => {
    // Silence since day one is the worst case, not an exemption.
    const v = inactivityBreach({ stage: "proposal", lastActivityAt: null, stageEnteredAt: days(10) }, now);
    expect(v.breached).toBe(true);
  });

  it("judges on hold against its own follow-up date, not a stage timeout", () => {
    // Parked until March is not neglected; it is parked.
    const future = new Date(now.getTime() + 30 * 86_400_000);
    expect(inactivityBreach({ stage: "on_hold", lastActivityAt: days(60), stageEnteredAt: days(60), followUpDate: future }, now).breached).toBe(false);

    const past = new Date(now.getTime() - 2 * 3_600_000);
    const v = inactivityBreach({ stage: "on_hold", lastActivityAt: days(1), stageEnteredAt: days(1), followUpDate: past }, now);
    expect(v.breached).toBe(true);
    expect(v.breached === true && v.reason).toMatch(/hour/);
  });

  it("treats on hold with no follow-up date as a breach immediately", () => {
    expect(inactivityBreach({ stage: "on_hold", lastActivityAt: days(0), stageEnteredAt: days(0) }, now).breached).toBe(true);
  });

  it("escalates on a second breach", () => {
    const v = inactivityBreach(
      { stage: "new", lastActivityAt: days(9), stageEnteredAt: days(9), priorBreaches: 1 },
      now
    );
    expect(v.breached === true && v.escalate).toBe(true);
  });

  it("never chases a closed opportunity", () => {
    expect(inactivityBreach({ stage: "won", lastActivityAt: days(400), stageEnteredAt: days(400) }, now).breached).toBe(false);
    expect(inactivityBreach({ stage: "lost", lastActivityAt: days(400), stageEnteredAt: days(400) }, now).breached).toBe(false);
  });
});

describe("identifiers", () => {
  it("are padded and stable", () => {
    expect(opportunityRef(2026, 7)).toBe("OPP-2026-00007");
    expect(customerRef(42)).toBe("CUS-000042");
  });
});
