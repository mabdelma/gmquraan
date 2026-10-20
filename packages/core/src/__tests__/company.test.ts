import { describe, expect, it } from "vitest";
import {
  COMPANY_STATUSES,
  companyCodeProblem,
  companyDeleteProblem,
  companyProblem,
  companyTransitionProblem,
  currencyChangeProblem,
  groupProblem,
  isRegisteredCompanyStatus,
} from "../index.js";

const base = {
  code: "ORG-ES",
  legalName: "Unskinned S.L.",
  country: "Spain",
  baseCurrency: "EUR",
  status: "ACTIVE" as const,
};

describe("company code", () => {
  it("accepts the codes already in use", () => {
    // These are written onto every existing record as entityId. If the rules
    // rejected them, promoting ENTITIES to rows would need a backfill.
    for (const c of ["ORG-ES", "ORG-UAE", "ORG-CA", "ORG-EG"]) {
      expect(companyCodeProblem(c)).toBeNull();
    }
  });

  it("refuses lowercase, because the code is compared exactly", () => {
    // Two codes differing only by case would be two companies to the scope
    // check and one company to a person reading the screen.
    expect(companyCodeProblem("app-es")).toMatch(/uppercase/i);
  });

  it("refuses spaces and punctuation", () => {
    expect(companyCodeProblem("ORG ES")).toMatch(/letters, numbers and hyphens/i);
    expect(companyCodeProblem("APP_ES")).toMatch(/letters, numbers and hyphens/i);
    expect(companyCodeProblem("ORG.ES")).toMatch(/letters, numbers and hyphens/i);
  });

  it("refuses stray hyphens", () => {
    expect(companyCodeProblem("-ORG")).toMatch(/hyphen/i);
    expect(companyCodeProblem("ORG-")).toMatch(/hyphen/i);
    expect(companyCodeProblem("ORG--ES")).toMatch(/two hyphens/i);
  });

  it("refuses an empty or oversized code", () => {
    expect(companyCodeProblem("")).toMatch(/give the company a code/i);
    expect(companyCodeProblem("A".repeat(25))).toMatch(/stop at/i);
  });
});

describe("saving a company", () => {
  it("accepts a well-formed company", () => {
    expect(companyProblem(base)).toBeNull();
  });

  it("refuses a duplicate code", () => {
    expect(companyProblem({ ...base, existingCodes: ["ORG-ES"] })).toMatch(/already uses that code/i);
  });

  it("lets a company keep its own code while being edited", () => {
    expect(
      companyProblem({ ...base, existingCodes: ["ORG-ES", "ORG-CA"], currentCode: "ORG-ES" })
    ).toBeNull();
  });

  it("requires a legal name and a country", () => {
    expect(companyProblem({ ...base, legalName: "  " })).toMatch(/legal name/i);
    expect(companyProblem({ ...base, country: "" })).toMatch(/country/i);
  });

  it("requires an ISO 4217 base currency", () => {
    expect(companyProblem({ ...base, baseCurrency: "" })).toMatch(/base currency/i);
    expect(companyProblem({ ...base, baseCurrency: "Euro" })).toMatch(/ISO 4217/i);
    expect(companyProblem({ ...base, baseCurrency: "eur" })).toMatch(/ISO 4217/i);
    expect(companyProblem({ ...base, baseCurrency: "AED" })).toBeNull();
  });
});

describe("base currency changes", () => {
  it("allows a change before anything is recorded", () => {
    expect(currencyChangeProblem("EUR", "USD", false)).toBeNull();
  });

  it("refuses a change once figures exist", () => {
    // Every posted figure is denominated in it. Changing it afterwards restates
    // history without touching a single number.
    expect(currencyChangeProblem("EUR", "USD", true)).toMatch(/restate/i);
  });

  it("is not a change when it is the same currency", () => {
    expect(currencyChangeProblem("EUR", "EUR", true)).toBeNull();
  });

  it("still validates the format on an allowed change", () => {
    expect(currencyChangeProblem("EUR", "Dollars", false)).toMatch(/ISO 4217/i);
  });
});

describe("registered entities versus operating locations", () => {
  it("treats an operating location as not registered", () => {
    // Example Country: staff in North City and Alexandria, no registration of its own.
    expect(isRegisteredCompanyStatus("OPERATING_LOCATION")).toBe(false);
  });

  it("treats active, planned and dormant as registered", () => {
    expect(isRegisteredCompanyStatus("ACTIVE")).toBe(true);
    expect(isRegisteredCompanyStatus("PLANNED")).toBe(true);
    expect(isRegisteredCompanyStatus("DORMANT")).toBe(true);
  });

  it("covers every status", () => {
    for (const s of COMPANY_STATUSES) expect(typeof isRegisteredCompanyStatus(s)).toBe("boolean");
  });
});

describe("company lifecycle", () => {
  it("walks the ordinary path", () => {
    expect(companyTransitionProblem("PLANNED", "ACTIVE")).toBeNull();
    expect(companyTransitionProblem("ACTIVE", "DORMANT")).toBeNull();
    expect(companyTransitionProblem("DORMANT", "ACTIVE")).toBeNull();
  });

  it("promotes an operating location once it registers", () => {
    expect(companyTransitionProblem("OPERATING_LOCATION", "ACTIVE")).toBeNull();
  });

  it("treats CLOSED as terminal", () => {
    expect(companyTransitionProblem("CLOSED", "ACTIVE")).toMatch(/terminal/i);
  });

  it("refuses a move to the state it is already in", () => {
    expect(companyTransitionProblem("ACTIVE", "ACTIVE")).toMatch(/already/i);
  });
});

describe("deleting a company", () => {
  it("refuses while records are filed against it", () => {
    // entityId is written onto records. Deleting the row leaves them pointing
    // at a company that no longer exists, and the scope check then compares
    // against nothing.
    expect(companyDeleteProblem({ records: 12, branches: 0 })).toMatch(/12 records are filed/i);
    expect(companyDeleteProblem({ records: 12, branches: 0 })).toMatch(/close it instead/i);
  });

  it("refuses while branches are attached", () => {
    expect(companyDeleteProblem({ records: 0, branches: 2 })).toMatch(/2 branches are attached/i);
  });

  it("reads as a sentence for one record", () => {
    expect(companyDeleteProblem({ records: 1, branches: 0 })).toMatch(/1 record is filed/i);
  });

  it("allows deleting an empty company", () => {
    expect(companyDeleteProblem({ records: 0, branches: 0 })).toBeNull();
  });
});

describe("business group", () => {
  it("accepts a name", () => {
    expect(groupProblem({ name: "Unskinned Group" })).toBeNull();
  });

  it("refuses an empty or duplicate name", () => {
    expect(groupProblem({ name: "  " })).toMatch(/give the group a name/i);
    expect(groupProblem({ name: "Group A", existingNames: ["Group A"] })).toMatch(/already uses/i);
  });

  it("lets a group keep its own name while being edited", () => {
    expect(groupProblem({ name: "Group A", existingNames: ["Group A"], currentName: "Group A" })).toBeNull();
  });
});
