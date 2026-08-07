import { describe, expect, it } from "vitest";
import { staffMoraleBand, staffMoraleEffectCopy } from "./PayrollPanel";

describe("staffMoraleBand", () => {
  it("maps basso below 40", () => {
    expect(staffMoraleBand(0)).toBe("basso");
    expect(staffMoraleBand(39)).toBe("basso");
  });

  it("maps medio between 40 and 69", () => {
    expect(staffMoraleBand(40)).toBe("medio");
    expect(staffMoraleBand(69)).toBe("medio");
  });

  it("maps alto at 70 and above", () => {
    expect(staffMoraleBand(70)).toBe("alto");
    expect(staffMoraleBand(100)).toBe("alto");
  });
});

describe("staffMoraleEffectCopy", () => {
  it("warns on basso", () => {
    expect(staffMoraleEffectCopy(30)).toMatch(/dimissioni/i);
  });

  it("praises alto", () => {
    expect(staffMoraleEffectCopy(80)).toBe("Team efficace");
  });

  it("is silent on medio", () => {
    expect(staffMoraleEffectCopy(50)).toBeNull();
  });
});
