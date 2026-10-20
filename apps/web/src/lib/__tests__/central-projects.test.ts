import { describe, it, expect } from "vitest";
import { readProjectBody, validateProject, PROJECT_STATUSES } from "../central-projects";

describe("project input handling", () => {
  const base = {
    title: "Warehouse expansion",
    summary: "A logistics hub in Dubai South.",
    body: "Detailed body.",
  };

  it("derives a slug from the title", () => {
    expect(readProjectBody(base).slug).toBe("warehouse-expansion");
    expect(readProjectBody({ ...base, slug: "My Project!" }).slug).toBe("my-project");
  });

  it("defaults status to ONGOING and publishes only when asked", () => {
    expect(readProjectBody(base).status).toBe("ONGOING");
    expect(readProjectBody(base).published).toBe(false);
    expect(readProjectBody({ ...base, status: "completed", published: true }).status).toBe("COMPLETED");
  });

  it("ignores unknown statuses rather than inventing one", () => {
    expect(readProjectBody({ ...base, status: "SECRET" }).status).toBe("ONGOING");
    expect(PROJECT_STATUSES).toContain("ONGOING");
  });

  it("requires the fields a card cannot render without", () => {
    expect(validateProject(readProjectBody(base))).toBeNull();
    expect(validateProject(readProjectBody({ ...base, title: "" }))).toMatch(/Title/);
    expect(validateProject(readProjectBody({ ...base, summary: "" }))).toMatch(/Summary/);
    expect(validateProject(readProjectBody({ ...base, body: "" }))).toMatch(/Body/);
  });
});
