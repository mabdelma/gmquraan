import { describe, expect, it } from "vitest";
import {
  MAX_UPLOAD_BYTES,
  isPreviewable,
  nextVersion,
  operationFor,
  replaceProblem,
  storagePath,
  uploadProblem,
} from "../index.js";

const pdfHead = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
const pngHead = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
const exeHead = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]);
const elfHead = new Uint8Array([0x7f, 0x45, 0x4c, 0x46]);

const ok = { filename: "report.pdf", mimeType: "application/pdf", sizeBytes: 1024, head: pdfHead };

describe("upload validation", () => {
  it("accepts a genuine PDF", () => {
    expect(uploadProblem(ok)).toBeNull();
  });

  it("refuses an executable however it is dressed", () => {
    expect(uploadProblem({ ...ok, filename: "setup.exe", mimeType: "application/pdf" })).toMatch(/\.exe/);
    // Declared as a PDF, named as a PDF, but the bytes are a Windows binary.
    expect(uploadProblem({ ...ok, head: exeHead })).toMatch(/Windows executable/);
    expect(uploadProblem({ ...ok, head: elfHead })).toMatch(/Linux executable/);
  });

  it("takes the last extension, so a double extension cannot smuggle one through", () => {
    // "report.pdf.exe" is an executable, not a PDF.
    expect(uploadProblem({ ...ok, filename: "report.pdf.exe" })).toMatch(/\.exe/);
  });

  it("refuses a type nobody declared", () => {
    expect(uploadProblem({ ...ok, filename: "x.iso", mimeType: "application/x-iso9660-image" })).toMatch(
      /not an accepted document type/
    );
  });

  it("refuses a mismatch between the extension and the declared type", () => {
    expect(uploadProblem({ ...ok, filename: "photo.png", mimeType: "application/pdf" })).toMatch(
      /does not match the declared type/
    );
  });

  it("catches a renamed binary claiming to be an image", () => {
    expect(uploadProblem({ filename: "logo.png", mimeType: "image/png", sizeBytes: 10, head: pdfHead })).toMatch(
      /not a PNG/
    );
    expect(uploadProblem({ filename: "logo.png", mimeType: "image/png", sizeBytes: 10, head: pngHead })).toBeNull();
  });

  it("refuses path characters in a filename", () => {
    expect(uploadProblem({ ...ok, filename: "../../etc/passwd.pdf" })).toMatch(/characters we do not accept/);
  });

  it("refuses empty and oversized files", () => {
    expect(uploadProblem({ ...ok, sizeBytes: 0 })).toMatch(/empty/);
    expect(uploadProblem({ ...ok, sizeBytes: MAX_UPLOAD_BYTES + 1 })).toMatch(/limited to/);
  });

  it("lets a plain text file through without a signature check", () => {
    // Text has no magic number; the check catches renamed binaries, not lies
    // no signature could detect.
    expect(uploadProblem({ filename: "notes.txt", mimeType: "text/plain", sizeBytes: 5 })).toBeNull();
  });
});

describe("preview", () => {
  it("renders the safe formats inline", () => {
    for (const t of ["application/pdf", "text/markdown", "image/png"]) {
      expect(isPreviewable(t), t).toBe(true);
    }
  });

  it("never previews SVG", () => {
    // SVG can carry script, and previewing inline would run it in our origin.
    expect(isPreviewable("image/svg+xml")).toBe(false);
  });

  it("does not preview office documents", () => {
    expect(
      isPreviewable("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    ).toBe(false);
  });
});

describe("storage layout", () => {
  const digest = "a".repeat(64);

  it("shards by the digest so no directory grows unbounded", () => {
    expect(storagePath(digest)).toBe(`aa/aa/${digest}`);
  });

  it("refuses anything that is not a digest", () => {
    expect(() => storagePath("../../etc/passwd")).toThrow();
    expect(() => storagePath("SHORT")).toThrow();
    expect(() => storagePath("A".repeat(64))).toThrow(); // uppercase is not our form
  });
});

describe("permission mapping", () => {
  it("separates preview from download", () => {
    // Reading in a controlled viewer is not taking a copy.
    expect(operationFor("preview")).toBe("read");
    expect(operationFor("download")).toBe("download");
    expect(operationFor("list")).toBe("discover");
  });
});

describe("versioning", () => {
  it("moves the minor on a revision and the major on approval", () => {
    expect(nextVersion({ versionMajor: 0, versionMinor: 3 }, "revision")).toEqual({ versionMajor: 0, versionMinor: 4 });
    expect(nextVersion({ versionMajor: 0, versionMinor: 4 }, "approval")).toEqual({ versionMajor: 1, versionMinor: 0 });
  });

  it("refuses to replace a record under legal hold", () => {
    expect(replaceProblem({ state: "DRAFT", legalHold: true })).toMatch(/legal hold/);
  });

  it("refuses to revise a disposed or archived record", () => {
    expect(replaceProblem({ state: "DELETED" })).toMatch(/disposed/);
    expect(replaceProblem({ state: "ARCHIVED" })).toMatch(/raise a new record/);
  });

  it("allows a revision of a draft or an approved record", () => {
    expect(replaceProblem({ state: "DRAFT" })).toBeNull();
    // Approved is allowed because the revision supersedes rather than
    // overwrites — that is enforced by the document lifecycle.
    expect(replaceProblem({ state: "APPROVED" })).toBeNull();
  });
});
