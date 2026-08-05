import { describe, expect, it } from "vitest";
import {
  CITIES,
  REGIONS,
  cityById,
  densityIndexFor,
  firmsInSector,
  monthlyRentFor,
} from "../config/market";
import { issueCustomerInvoice, recordSupplierCost } from "./actions";
import { advanceMonth } from "./advanceMonth";
import { marketModifiersFromIndex } from "./market";
import { createInitialGameState, type CityId, type SectorId } from "./types";

const ROMA: CityId = "058091";
const SALERNO: CityId = "065116";

const startIn = (city: CityId, sector: SectorId) => createInitialGameState({ city, sector });

describe("ISTAT geography pack", () => {
  it("loads all 20 regions and thousands of comuni", () => {
    expect(REGIONS.length).toBe(20);
    expect(CITIES.length).toBeGreaterThan(7000);
    expect(cityById(ROMA).label).toBe("Roma");
    expect(cityById(ROMA).capoluogo).toBe(true);
  });
});

describe("marketModifiersFromIndex", () => {
  it("gives a price bonus when density is below median", () => {
    const m = marketModifiersFromIndex(0.5);
    expect(m.priceFactor).toBeGreaterThan(1);
  });

  it("gives a price malus when density is well above median", () => {
    const m = marketModifiersFromIndex(1.8);
    expect(m.priceFactor).toBeLessThan(1);
  });
});

describe("province InfoCamere applied to comuni", () => {
  it("loads firm counts for Roma commercio", () => {
    expect(firmsInSector(ROMA, "commercio")).toBeGreaterThan(50000);
    expect(densityIndexFor(ROMA, "commercio")).toBeGreaterThan(0);
  });

  it("scales invoices by density for a high-pressure city", () => {
    const s = startIn(SALERNO, "commercio");
    const factor = marketModifiersFromIndex(s.company.densityIndex).priceFactor;
    expect(s.company.densityIndex).toBeGreaterThan(1);
    const next = issueCustomerInvoice(s, 1000);
    expect(next.invoices[0].net).toBeCloseTo(1000 * factor);
  });

  it("scales supplier costs", () => {
    const s = startIn(SALERNO, "commercio");
    const factor = marketModifiersFromIndex(s.company.densityIndex).costFactor;
    const next = recordSupplierCost(s, 400);
    expect(next.invoices[0].net).toBeCloseTo(400 * factor);
  });

  it("charges monthly rent for Roma", () => {
    const s = startIn(ROMA, "servizi");
    const rent = monthlyRentFor(ROMA);
    expect(s.company.monthlyRent).toBe(rent);
    const next = advanceMonth(s);
    expect(next.company.cash).toBeCloseTo(10000 - rent);
  });
});
