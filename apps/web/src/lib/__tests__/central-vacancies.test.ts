import { describe, it, expect } from "vitest";
import { readVacancyBody, validateVacancy, WORK_MODES, JOB_TYPES } from "../central-vacancies";

describe("vacancy input handling", () => {
  const base = {
    title: "Operations Manager",
    summary: "Run daily operations for the logistics arm.",
    body: "Detailed body.",
    location: "Dubai, UAE"
  };

  it("derives a slug from the title", () => {
    expect(readVacancyBody(base).slug).toBe("operations-manager");
    expect(readVacancyBody({ ...base, slug: "Ops Lead!" }).slug).toBe("ops-lead");
  });

  it("defaults work mode and type, accepting their known values", () => {
    expect(readVacancyBody(base).workMode).toBe("ON_SITE");
    expect(readVacancyBody(base).type).toBe("FULL_TIME");
    expect(readVacancyBody({ ...base, workMode: "hybrid", type: "contract" }).workMode).toBe("HYBRID");
    expect(readVacancyBody({ ...base, workMode: "hybrid", type: "contract" }).type).toBe("CONTRACT");
  });

  it("ignores unknown modes and types rather than inventing them", () => {
    expect(readVacancyBody({ ...base, workMode: "X", type: "Y" }).workMode).toBe("ON_SITE");
    expect(readVacancyBody({ ...base, workMode: "X", type: "Y" }).type).toBe("FULL_TIME");
    expect(WORK_MODES).toContain("ON_SITE");
    expect(JOB_TYPES).toContain("FULL_TIME");
  });

  it("requires the fields a listing cannot render without", () => {
    expect(validateVacancy(readVacancyBody(base))).toBeNull();
    expect(validateVacancy(readVacancyBody({ ...base, title: "" }))).toMatch(/Title/);
    expect(validateVacancy(readVacancyBody({ ...base, location: "" }))).toMatch(/Location/);
    expect(validateVacancy(readVacancyBody({ ...base, body: "" }))).toMatch(/Body/);
  });
});
