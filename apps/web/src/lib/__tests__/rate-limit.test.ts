import { describe, it, expect } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  it("allows up to the limit then blocks within the window", () => {
    const key = `t-${Math.random()}`;
    expect(rateLimit(key, 3, 10_000)).toBe(true);
    expect(rateLimit(key, 3, 10_000)).toBe(true);
    expect(rateLimit(key, 3, 10_000)).toBe(true);
    expect(rateLimit(key, 3, 10_000)).toBe(false);
  });

  it("isolates different keys", () => {
    expect(rateLimit(`a-${Math.random()}`, 1, 10_000)).toBe(true);
    expect(rateLimit(`b-${Math.random()}`, 1, 10_000)).toBe(true);
  });
});
