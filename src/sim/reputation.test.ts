import { describe, expect, it } from "vitest";
import {
  repContractMult,
  repDefaultMult,
  repDemandMult,
  repSlotBonus,
} from "./reputation";
import { monthlyCapacity } from "./events";
import { createInitialGameState } from "./types";

describe("reputation market helpers", () => {
  it("repSlotBonus matches locked table", () => {
    expect(repSlotBonus(0)).toBe(0);
    expect(repSlotBonus(50)).toBe(3);
    expect(repSlotBonus(80)).toBe(4);
    expect(repSlotBonus(100)).toBe(5);
  });

  it("repSlotBonus differs at 80 vs 100", () => {
    expect(repSlotBonus(100)).toBeGreaterThan(repSlotBonus(80));
  });

  it("monthlyCapacity gains a slot from 80 → 100 rep", () => {
    const low = createInitialGameState();
    low.company.reputation = 80;
    low.staffMorale = 100;
    const high = { ...low, company: { ...low.company, reputation: 100 } };
    expect(monthlyCapacity(high)).toBe(monthlyCapacity(low) + 1);
  });

  it("repDemandMult matches locked table", () => {
    expect(repDemandMult(0)).toBeCloseTo(0.75);
    expect(repDemandMult(50)).toBeCloseTo(1.0);
    expect(repDemandMult(80)).toBeCloseTo(1.15);
    expect(repDemandMult(100)).toBeCloseTo(1.25);
  });

  it("repContractMult is clamped and scales with rep", () => {
    expect(repContractMult(0)).toBeCloseTo(0.55);
    expect(repContractMult(50)).toBeCloseTo(0.8);
    expect(repContractMult(100)).toBeCloseTo(1.05);
    expect(repContractMult(-40)).toBe(0.4);
    expect(repContractMult(200)).toBe(1.1);
  });

  it("repDefaultMult matches locked endpoints", () => {
    expect(repDefaultMult(0)).toBeCloseTo(1.45);
    expect(repDefaultMult(100)).toBeCloseTo(0.95);
    expect(repDefaultMult(50)).toBeCloseTo(1.2);
  });

  it("demand and default are monotonic in opposite directions", () => {
    expect(repDemandMult(100)).toBeGreaterThan(repDemandMult(20));
    expect(repDefaultMult(20)).toBeGreaterThan(repDefaultMult(100));
  });
});
