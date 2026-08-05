import { describe, expect, it } from "vitest";
import {
  EMERGENCY_SUPPLY_NET,
  generateOpportunities,
  orderEmergencySupply,
} from "./events";
import { createInitialGameState } from "./types";

describe("emergency / guaranteed supply", () => {
  it("con scorte 0 il board ha almeno una fornitura", () => {
    const s = createInitialGameState();
    s.supplyMonths = 0;
    s.monthsPlayed = 3;
    const { ops } = generateOpportunities(s);
    expect(ops.some((o) => o.kind === "supply")).toBe(true);
  });

  it("ordine emergenza alza scorte e crea AP", () => {
    let s = createInitialGameState();
    s.supplyMonths = 0;
    s.company.cash = 20000;
    const inv0 = s.invoices.length;
    s = orderEmergencySupply(s);
    expect(s.supplyMonths).toBe(2);
    expect(s.invoices.length).toBe(inv0 + 1);
    expect(s.invoices.at(-1)?.net).toBe(EMERGENCY_SUPPLY_NET);
  });
});
