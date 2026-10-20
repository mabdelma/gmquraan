import { describe, expect, it } from "vitest";
import {
  ancestorsOf,
  breadcrumbs,
  buildFolderTree,
  findFolder,
  humanFolder,
  parentOf,
  visibleChildren,
  zoneOf,
} from "../index.js";

const FOLDERS = [
  "00_SYSTEM",
  "00_SYSTEM/01_CONFIGURATION",
  "00_SYSTEM/09_LOGS",
  "04_PEOPLE_AND_ORGANIZATION",
  "04_PEOPLE_AND_ORGANIZATION/04_EMPLOYEE_RECORDS",
  "08_FINANCE_AND_PROCUREMENT",
];

const DOCS = [
  "00_SYSTEM/01_CONFIGURATION/roles.csv",
  "00_SYSTEM/01_CONFIGURATION/entities.csv",
  "04_PEOPLE_AND_ORGANIZATION/04_EMPLOYEE_RECORDS/contract.pdf",
];

describe("paths", () => {
  it("identifies the zone", () => {
    expect(zoneOf("00_SYSTEM/01_CONFIGURATION/roles.csv")).toBe("00_SYSTEM");
    expect(zoneOf("not_a_zone/x")).toBeNull();
  });

  it("lists ancestors closest last", () => {
    expect(ancestorsOf("a/b/c")).toEqual(["a", "a/b"]);
    expect(ancestorsOf("a")).toEqual([]);
    expect(parentOf("a/b/c")).toBe("a/b");
    expect(parentOf("a")).toBeNull();
  });

  it("builds breadcrumbs that each address a real path", () => {
    expect(breadcrumbs("00_SYSTEM/01_CONFIGURATION")).toEqual([
      { name: "00_SYSTEM", path: "00_SYSTEM" },
      { name: "01_CONFIGURATION", path: "00_SYSTEM/01_CONFIGURATION" },
    ]);
    expect(breadcrumbs("")).toEqual([]);
  });

  it("reads folder names as prose without losing the ordering prefix", () => {
    expect(humanFolder("04_PEOPLE_AND_ORGANIZATION")).toBe("People and organization");
    expect(humanFolder("00_START_HERE")).toBe("Start here");
  });
});

describe("tree", () => {
  const tree = buildFolderTree(FOLDERS, DOCS);

  it("nests folders under their parents", () => {
    const system = findFolder(tree, "00_SYSTEM")!;
    expect(system.children.map((c) => c.name).sort()).toEqual(["01_CONFIGURATION", "09_LOGS"]);
  });

  it("counts documents where they are filed, not in ancestors", () => {
    expect(findFolder(tree, "00_SYSTEM/01_CONFIGURATION")!.documentCount).toBe(2);
    expect(findFolder(tree, "00_SYSTEM")!.documentCount).toBe(0);
  });

  it("rolls totals upward so a closed folder shows what is inside it", () => {
    expect(findFolder(tree, "00_SYSTEM")!.totalCount).toBe(2);
    expect(tree.totalCount).toBe(3);
  });

  it("keeps declared-but-empty folders", () => {
    // A folder that exists and is empty says "this belongs here and we have
    // none yet", which is not the same as the folder being absent.
    const logs = findFolder(tree, "00_SYSTEM/09_LOGS")!;
    expect(logs).toBeTruthy();
    expect(logs.totalCount).toBe(0);
  });

  it("creates a folder implied by a document even if nobody declared it", () => {
    // A document filed somewhere unrecorded must appear, not vanish because
    // the location was never listed.
    const t = buildFolderTree([], ["06_COMMERCIAL/02_OPPORTUNITIES/deal.md"]);
    expect(findFolder(t, "06_COMMERCIAL/02_OPPORTUNITIES")!.documentCount).toBe(1);
  });

  it("sorts children by name so the order is stable", () => {
    const t = buildFolderTree(["z/b", "z/a", "z/c"], []);
    expect(findFolder(t, "z")!.children.map((c) => c.name)).toEqual(["a", "b", "c"]);
  });

  it("returns null for a folder that does not exist", () => {
    expect(findFolder(tree, "00_SYSTEM/99_NOPE")).toBeNull();
  });
});

describe("visibility", () => {
  it("hides a folder whose contents the viewer cannot see", () => {
    // The viewer sees no documents under 04_PEOPLE, so that branch is empty
    // for them — and it is not empty for everyone, so it is hidden rather than
    // shown as an empty location.
    const mine = buildFolderTree(FOLDERS, ["00_SYSTEM/01_CONFIGURATION/roles.csv"]);
    const shown = visibleChildren(mine, (p) => p === "08_FINANCE_AND_PROCUREMENT");

    expect(shown.map((c) => c.name)).toContain("00_SYSTEM");
    expect(shown.map((c) => c.name)).not.toContain("04_PEOPLE_AND_ORGANIZATION");
  });

  it("still shows a location that is empty for everybody", () => {
    // Declared but unused is honest to show; hiding it would misrepresent the
    // information architecture.
    const mine = buildFolderTree(FOLDERS, []);
    const shown = visibleChildren(mine, (p) => p === "08_FINANCE_AND_PROCUREMENT");
    expect(shown.map((c) => c.name)).toEqual(["08_FINANCE_AND_PROCUREMENT"]);
  });
});
