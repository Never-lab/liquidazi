import { describe, expect, it } from "vitest";
import {
  applyLayerCredit,
  pickMarketLayer,
  repContractMult,
  repDefaultMult,
  repDemandMult,
  repSlotBonus,
} from "./reputation";
import { monthlyCapacity, generateOpportunities } from "./events";
import { createInitialGameState } from "./types";
import { CITIES, citiesInRegion, cityById } from "../config/market";
import { advanceMonth } from "./advanceMonth";
import { issueCustomerInvoice } from "./actions";

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

describe("reputation layers", () => {
  it("at municipal 0 never picks municipal or national", () => {
    for (let i = 0; i < 20; i++) {
      expect(pickMarketLayer(0, 0, () => i / 20)).toBe("local");
    }
  });

  it("high municipal can pick municipal", () => {
    const layers = new Set(
      Array.from({ length: 40 }, (_, i) => pickMarketLayer(80, 0, () => (i + 0.5) / 40)),
    );
    expect(layers.has("municipal")).toBe(true);
    expect(layers.has("national")).toBe(false);
  });

  it("local settle +1 local; 5 local settles +1 municipal and 0 national", () => {
    const s = createInitialGameState();
    applyLayerCredit(s, "local");
    expect(s.company.reputation).toBe(51);
    expect(s.company.repMunicipal).toBe(0);
    for (let i = 0; i < 4; i++) applyLayerCredit(s, "local");
    expect(s.company.reputation).toBe(55);
    expect(s.company.repMunicipal).toBe(1);
    expect(s.company.repNational).toBe(0);
  });

  it("municipal settle +1 municipal; national every 5 municipal; national settle no points", () => {
    const s = createInitialGameState();
    s.company.repMunicipal = 4;
    applyLayerCredit(s, "municipal");
    expect(s.company.repMunicipal).toBe(5);
    expect(s.company.repNational).toBe(1);
    const loc = s.company.reputation;
    applyLayerCredit(s, "national");
    expect(s.company.reputation).toBe(loc);
    expect(s.company.repMunicipal).toBe(5);
    expect(s.company.repNational).toBe(1);
  });

  it("AR settle credits local; accept path is not required", () => {
    let s = createInitialGameState();
    s.quietMode = true;
    s = issueCustomerInvoice(s, 1000, { clientType: "private", termMonths: 1, marketLayer: "local" });
    expect(s.company.reputation).toBe(50);
    s = advanceMonth(s);
    s = advanceMonth(s);
    expect(s.invoices[0]!.settled).toBe(true);
    expect(s.company.reputation).toBe(51);
  });

  it("issues municipal-sized AR with long terms", () => {
    let s = createInitialGameState();
    s = issueCustomerInvoice(s, 40000, {
      clientType: "pa",
      termMonths: 24,
      marketLayer: "national",
    });
    expect(s.invoices).toHaveLength(1);
    expect(s.invoices[0]!.net).toBeGreaterThan(35000);
    expect(s.invoices[0]!.dueIdx - s.invoices[0]!.issuedIdx).toBe(24);
  });

  it("high municipal reputation puts 25–40k PA jobs on the board", () => {
    const s = createInitialGameState({ city: "058091", sector: "servizi" });
    s.company.repMunicipal = 80;
    const { ops } = generateOpportunities(s, { forceRegime: "normale" });
    const municipal = ops.filter((o) => o.marketLayer === "municipal");
    expect(municipal.length).toBeGreaterThan(0);
    const home = cityById("058091");
    const regionNames = citiesInRegion(home.regionId)
      .filter((c) => c.capoluogo)
      .map((c) => c.label);
    for (const op of municipal) {
      expect(op.clientType).toBe("pa");
      expect(op.net).toBeGreaterThanOrEqual(25000);
      expect(op.net).toBeLessThanOrEqual(40000);
      expect(op.termMonths).toBeGreaterThanOrEqual(6);
      expect(op.title).not.toContain("058091");
      expect(regionNames.some((n) => op.title.includes(n))).toBe(true);
    }
  });

  it("national jobs name a city outside the home region", () => {
    const s = createInitialGameState({ city: "058091", sector: "servizi" });
    s.company.repMunicipal = 100;
    s.company.repNational = 20;
    const { ops } = generateOpportunities(s, { forceRegime: "boom" });
    const national = ops.filter((o) => o.marketLayer === "national");
    expect(national.length).toBeGreaterThan(0);
    const home = cityById("058091");
    for (const op of national) {
      expect(op.title).not.toContain("058091");
      expect(op.title).not.toMatch(/\b\d{6}\b/);
      const named = CITIES.filter((c) => c.capoluogo && op.title.includes(c.label));
      expect(named.length).toBeGreaterThan(0);
      expect(named.every((c) => c.regionId !== home.regionId)).toBe(true);
    }
  });
});
