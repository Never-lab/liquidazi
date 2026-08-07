import { describe, expect, it } from "vitest";
import { rng } from "../sim/rng";
import {
  drawProjectOptions,
  PROJECTS,
  type ProjectId,
} from "./projects";

const ALL_IDS: ProjectId[] = [
  "digitalizzazione",
  "magazzino",
  "formazione",
  "espansione_commerciale",
];

describe("project catalog", () => {
  it("defines all four projects with exact economy", () => {
    expect(PROJECTS.digitalizzazione).toMatchObject({
      cost: 6000,
      durationMonths: 9,
      capacityBonus: 1,
      ticketMult: 1,
      compliancePerMonth: 1,
      rentFactor: 1,
      slotPenalty: 0,
      frozenCash: 0,
    });
    expect(PROJECTS.magazzino).toMatchObject({
      cost: 8000,
      durationMonths: 12,
      capacityBonus: 0,
      ticketMult: 1,
      compliancePerMonth: 0,
      rentFactor: 0.95,
      slotPenalty: 0,
      frozenCash: 2000,
    });
    expect(PROJECTS.formazione).toMatchObject({
      cost: 4500,
      durationMonths: 6,
      capacityBonus: 0,
      ticketMult: 1,
      compliancePerMonth: 2,
      rentFactor: 1,
      slotPenalty: 0,
      frozenCash: 0,
    });
    expect(PROJECTS.espansione_commerciale).toMatchObject({
      cost: 7000,
      durationMonths: 9,
      capacityBonus: 0,
      ticketMult: 1.06,
      compliancePerMonth: 0,
      rentFactor: 1,
      slotPenalty: 1,
      frozenCash: 0,
    });
  });

  it("each def has Italian label and blurb", () => {
    for (const id of ALL_IDS) {
      const def = PROJECTS[id];
      expect(def.label.length).toBeGreaterThan(2);
      expect(def.blurb.length).toBeGreaterThan(10);
    }
  });
});

describe("drawProjectOptions", () => {
  it("returns 2–3 unique ids", () => {
    for (let seed = 0; seed < 50; seed++) {
      const options = drawProjectOptions(rng(seed));
      expect(options.length).toBeGreaterThanOrEqual(2);
      expect(options.length).toBeLessThanOrEqual(3);
      expect(new Set(options).size).toBe(options.length);
      for (const id of options) {
        expect(ALL_IDS).toContain(id);
      }
    }
  });

  it("is deterministic for the same rng", () => {
    const a = drawProjectOptions(rng(42));
    const b = drawProjectOptions(rng(42));
    expect(a).toEqual(b);
  });
});
