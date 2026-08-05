import { describe, expect, it } from "vitest";
import { cityById, densityIndexFor, firmsInSector } from "../config/market";
import { issueCustomerInvoice, recordSupplierCost } from "./actions";
import { advanceMonth } from "./advanceMonth";
import { marketModifiersFromIndex } from "./market";
import { createInitialGameState, type CityId, type SectorId } from "./types";

const startIn = (city: CityId, sector: SectorId) => createInitialGameState({ city, sector });

describe("marketModifiersFromIndex", () => {
  it("gives a price bonus when density is below median", () => {
    const m = marketModifiersFromIndex(0.5);
    expect(m.priceFactor).toBeGreaterThan(1);
    expect(m.costFactor).toBeLessThanOrEqual(1);
  });

  it("gives a price malus when density is well above median", () => {
    const m = marketModifiersFromIndex(1.8);
    expect(m.priceFactor).toBeLessThan(1);
    expect(m.costFactor).toBeGreaterThan(1);
  });
});

describe("region/city real pack", () => {
  it("loads InfoCamere firm counts for Milano commercio", () => {
    expect(firmsInSector("milano", "commercio")).toBeGreaterThan(50000);
    expect(densityIndexFor("milano", "commercio")).toBeGreaterThan(0);
  });

  it("scales customer invoice net by local density index", () => {
    const s = startIn("salerno", "commercio");
    const factor = marketModifiersFromIndex(s.company.densityIndex).priceFactor;
    expect(factor).toBeLessThan(1);
    const next = issueCustomerInvoice(s, 1000);
    expect(next.invoices[0].net).toBeCloseTo(1000 * factor);
  });

  it("scales supplier cost by local density index", () => {
    const s = startIn("salerno", "commercio");
    const factor = marketModifiersFromIndex(s.company.densityIndex).costFactor;
    const next = recordSupplierCost(s, 400);
    expect(next.invoices[0].net).toBeCloseTo(400 * factor);
  });

  it("charges published city monthly rent into cash", () => {
    const s = startIn("roma", "servizi");
    const cash0 = s.company.cash;
    const rent = cityById("roma").monthlyRent;
    expect(s.company.monthlyRent).toBe(rent);
    const next = advanceMonth(s);
    expect(next.company.cash).toBeCloseTo(cash0 - rent);
    expect(next.ytd.otherCosts).toBeCloseTo(rent);
  });
});
