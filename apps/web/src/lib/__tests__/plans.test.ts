import { describe, it, expect } from "vitest";
import { effectivePlan, PLANS, PLAN_IDS } from "@/lib/plans";

describe("plans", () => {
  it("reverts an expired paid plan to STARTER", () => {
    expect(effectivePlan("GROWTH", new Date(Date.now() - 1000))).toBe("STARTER");
  });
  it("keeps an unexpired paid plan", () => {
    expect(effectivePlan("GROWTH", new Date(Date.now() + 1_000_000))).toBe("GROWTH");
  });
  it("defines every plan id", () => {
    for (const id of PLAN_IDS) expect(PLANS[id]).toBeTruthy();
  });
});
