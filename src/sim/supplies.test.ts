import { describe, expect, it } from "vitest";
import { tierForQuality } from "../config/supplies";
import { acceptOpportunity, orderEmergencySupply } from "./events";
import { advanceMonth } from "./advanceMonth";
import {
  applySupplyToSaleNet,
  deliverPendingSupply,
  migrateSupplyStock,
  queuePendingSupply,
  revenueMultFromStock,
  warehouseMonths,
} from "./supplies";
import { createInitialGameState, round2, toMonthIndex } from "./types";

describe("supply quality system", () => {
  it("tier revenue multipliers match spec", () => {
    expect(tierForQuality(40).revenueMult).toBe(0.9);
    expect(tierForQuality(65).revenueMult).toBe(1.05);
    expect(tierForQuality(80).revenueMult).toBe(1.1);
    expect(tierForQuality(95).revenueMult).toBe(1.05);
  });

  it("fornitura va in pending, magazzino al mese dopo", () => {
    let s = createInitialGameState();
    s.supplyStock = [];
    s.supplyMonths = 0;
    s.pendingSupply = [];
    s.opportunities = [
      {
        id: 1,
        kind: "supply",
        title: "Fornitura test",
        net: 15000,
        expiresInMonths: 1,
        termMonths: 1,
        supplyQuality: 68,
      },
    ];
    s = acceptOpportunity(s, 1);
    expect(warehouseMonths(s)).toBe(0);
    expect(s.pendingSupply?.length).toBe(1);
    s = advanceMonth(s);
    expect(warehouseMonths(s)).toBeGreaterThan(0);
    expect(s.pendingSupply?.length ?? 0).toBe(0);
  });

  it("medium stock gives +5% on sale net", () => {
    const s = createInitialGameState();
    s.supplyStock = [{ quality: 65, months: 2 }];
    migrateSupplyStock(s);
    expect(revenueMultFromStock(s)).toBe(1.05);
    const applied = applySupplyToSaleNet(s, 1000);
    expect(applied.net).toBe(round2(1000 * 1.05));
  });

  it("emergency order is pending until next month", () => {
    let s = createInitialGameState();
    s.supplyStock = [];
    s.pendingSupply = [];
    s.supplyMonths = 0;
    s.quietMode = true;
    s.company.cash = 20000;
    s = orderEmergencySupply(s);
    expect(warehouseMonths(s)).toBe(0);
    expect(s.pendingSupply?.length).toBe(1);
    s = advanceMonth(s);
    expect(warehouseMonths(s)).toBe(2);
  });

  it("deliverPendingSupply respects arrival month", () => {
    const s = createInitialGameState();
    s.supplyStock = [];
    s.supplyMonths = 0;
    s.pendingSupply = [{ quality: 70, months: 1, arrivesAtMonthIdx: toMonthIndex(s.calendar) + 1 }];
    deliverPendingSupply(s, toMonthIndex(s.calendar));
    expect(warehouseMonths(s)).toBe(0);
    deliverPendingSupply(s, toMonthIndex(s.calendar) + 1);
    expect(warehouseMonths(s)).toBe(1);
  });

  it("queuePendingSupply keeps supplyMonths in sync", () => {
    const s = createInitialGameState();
    s.supplyStock = [];
    s.supplyMonths = 0;
    s.pendingSupply = [];
    queuePendingSupply(s, 55, 2);
    expect(s.supplyMonths).toBe(2);
  });
});
