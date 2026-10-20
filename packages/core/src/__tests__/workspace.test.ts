import { describe, expect, it } from "vitest";
import {
  EMPLOYEE_AREAS,
  ZONES,
  areaPath,
  canOpenArea,
  newTaskProblem,
  workspaceRoot,
} from "../index.js";

const area = (code: string) => EMPLOYEE_AREAS.find((a) => a.code === code)!;

describe("workspace structure", () => {
  it("gives every employee the same eight areas", () => {
    expect(EMPLOYEE_AREAS).toHaveLength(8);
    expect(new Set(EMPLOYEE_AREAS.map((a) => a.code)).size).toBe(8);
  });

  it("puts every area inside a real zone of the information architecture", () => {
    for (const a of EMPLOYEE_AREAS) {
      const top = a.zonePath.split("/")[0];
      expect(ZONES, `${a.code} -> ${top}`).toContain(top);
    }
  });

  it("roots the path on the employee number so a name change does not move it", () => {
    const withNo = { employeeNo: "ORG-0007", email: "someone@example.com" };
    expect(workspaceRoot(withNo)).toContain("ORG-0007");
    // Renaming the person must not change the path.
    expect(workspaceRoot({ ...withNo, email: "newname@example.com" })).toBe(
      workspaceRoot(withNo)
    );
  });

  it("falls back to the mailbox when HR has issued no number", () => {
    expect(workspaceRoot({ employeeNo: null, email: "neveen@example.com" })).toContain("NEVEEN");
  });

  it("builds a full path per area", () => {
    const e = { employeeNo: "ORG-0007", email: "x@y.z" };
    expect(areaPath(e, area("05_LEAVE"))).toBe(
      "04_PEOPLE_AND_ORGANIZATION/04_EMPLOYEE_RECORDS/ORG-0007/05_LEAVE"
    );
  });
});

describe("who can open which area", () => {
  const self = { isSelf: true, isLineManager: false, isHr: false, isGroupWide: false };
  const line = { isSelf: false, isLineManager: true, isHr: false, isGroupWide: false };
  const hr = { isSelf: false, isLineManager: false, isHr: true, isGroupWide: false };
  const exec = { isSelf: false, isLineManager: false, isHr: false, isGroupWide: true };
  const stranger = { isSelf: false, isLineManager: false, isHr: false, isGroupWide: false };

  it("lets a person open every part of their own record", () => {
    for (const a of EMPLOYEE_AREAS) expect(canOpenArea(a, self), a.code).toBe(true);
  });

  it("lets a manager see the work, not the personal file", () => {
    expect(canOpenArea(area("02_MY_WORK"), line)).toBe(true);
    expect(canOpenArea(area("01_PERSONAL_RECORD"), line)).toBe(false);
    expect(canOpenArea(area("05_LEAVE"), line)).toBe(false);
  });

  it("keeps performance away from the line manager it might concern", () => {
    // The whole reason this area exists separately: a grievance or a
    // disciplinary process is sometimes about the manager.
    expect(canOpenArea(area("08_PERFORMANCE"), line)).toBe(false);
    expect(canOpenArea(area("08_PERFORMANCE"), hr)).toBe(true);
    expect(canOpenArea(area("08_PERFORMANCE"), exec)).toBe(true);
  });

  it("gives HR the personnel areas and the work too", () => {
    expect(canOpenArea(area("01_PERSONAL_RECORD"), hr)).toBe(true);
    expect(canOpenArea(area("02_MY_WORK"), hr)).toBe(true);
  });

  it("shows a colleague nothing", () => {
    for (const a of EMPLOYEE_AREAS) expect(canOpenArea(a, stranger), a.code).toBe(false);
  });

  it("classifies the personal areas above internal", () => {
    expect(area("01_PERSONAL_RECORD").classification).toBe("RESTRICTED");
    expect(area("08_PERFORMANCE").classification).toBe("RESTRICTED");
    expect(area("05_LEAVE").classification).toBe("CONFIDENTIAL");
  });
});

describe("creating a task", () => {
  const ok = { title: "Renew the Spanish licence", ownerId: "m1" };

  it("accepts the minimum needed to capture work", () => {
    expect(newTaskProblem(ok)).toBeNull();
  });

  it("does not demand the full control set at capture", () => {
    // Those are enforced on the way out of triage. Demanding them here is how
    // people stop capturing work in the system at all.
    expect(newTaskProblem({ ...ok, acceptanceCriteria: null, destination: null })).toBeNull();
  });

  it("insists on a title and an owner", () => {
    expect(newTaskProblem({ ...ok, title: "hi" })).toMatch(/four characters/);
    expect(newTaskProblem({ ...ok, ownerId: null })).toMatch(/accountable owner/);
  });

  it("refuses a due date that has already passed", () => {
    expect(newTaskProblem({ ...ok, dueAt: "2020-01-01" })).toMatch(/cannot be met/);
    expect(newTaskProblem({ ...ok, dueAt: "not-a-date" })).toMatch(/not a date/);
  });

  it("accepts today as a due date", () => {
    expect(newTaskProblem({ ...ok, dueAt: new Date() })).toBeNull();
  });
});
