import { describe, expect, it } from "vitest";
import { zoneById } from "../config/market";
import { issueCustomerInvoice, recordSupplierCost } from "./actions";
import { advanceMonth } from "./advanceMonth";
import { marketModifiers, rivalsFor } from "./market";
import { createInitialGameState, type SectorId, type ZoneId } from "./types";

const startIn = (zone: ZoneId, sector: SectorId) => createInitialGameState({ zone, sector });

describe("marketModifiers", () => {
  it("gives a price bonus when few rivals", () => {
    const m = marketModifiers(0);
    expect(m.priceFactor).toBeGreaterThan(1);
    expect(m.costFactor).toBeLessThanOrEqual(1);
  });

  it("gives a price malus when the zone is crowded", () => {
    const m = marketModifiers(6);
    expect(m.priceFactor).toBeLessThan(1);
    expect(m.costFactor).toBeGreaterThan(1);
  });
});

describe("zone + competition in play", () => {
  it("scales customer invoice net by local price factor", () => {
    const s = startIn("lombardia", "commercio");
    expect(s.company.rivals).toBe(rivalsFor("lombardia", "commercio"));
    const factor = marketModifiers(s.company.rivals).priceFactor;
    const next = issueCustomerInvoice(s, 1000);
    expect(next.invoices[0].net).toBeCloseTo(1000 * factor);
  });

  it("scales supplier cost by local cost factor", () => {
    const s = startIn("lombardia", "commercio");
    const factor = marketModifiers(s.company.rivals).costFactor;
    const next = recordSupplierCost(s, 400);
    expect(next.invoices[0].net).toBeCloseTo(400 * factor);
  });

  it("charges monthly zone rent into cash and otherCosts", () => {
    const s = startIn("lazio", "servizi");
    const cash0 = s.company.cash;
    const rent = zoneById("lazio").monthlyRent;
    expect(s.company.monthlyRent).toBe(rent);
    const next = advanceMonth(s);
    expect(next.company.cash).toBeCloseTo(cash0 - rent);
    expect(next.ytd.otherCosts).toBeCloseTo(rent);
  });
});
