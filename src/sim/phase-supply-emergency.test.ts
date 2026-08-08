import { describe, expect, it } from "vitest";
import {
  emergencySupplyNet,
  generateOpportunities,
  orderEmergencySupply,
  supplyMonthsFromNet,
} from "./events";
import { acceptAsContract } from "./contracts";
import { createInitialGameState, round2 } from "./types";

describe("emergency / guaranteed supply", () => {
  it("con scorte 0 il board ha almeno una fornitura", () => {
    const s = createInitialGameState();
    s.supplyMonths = 0;
    s.monthsPlayed = 3;
    const { ops } = generateOpportunities(s);
    expect(ops.some((o) => o.kind === "supply")).toBe(true);
  });

  it("emergency scales with cash at 10%, floor 1500", () => {
    const s = createInitialGameState();
    s.supplyMonths = 0;
    s.company.cash = 50000;
    expect(emergencySupplyNet(s)).toBe(5000);
    s.company.cash = 10000;
    expect(emergencySupplyNet(s)).toBe(1500);
  });

  it("supplyMonthsFromNet breakpoints", () => {
    expect(supplyMonthsFromNet(1199)).toBe(1);
    expect(supplyMonthsFromNet(1200)).toBe(2);
  });

  it("ordine emergenza alza scorte e crea AP al prezzo scalato", () => {
    let s = createInitialGameState();
    s.supplyMonths = 0;
    s.company.cash = 50000;
    const inv0 = s.invoices.length;
    const cost = emergencySupplyNet(s);
    s = orderEmergencySupply(s);
    expect(s.supplyMonths).toBe(2);
    expect(s.invoices.length).toBe(inv0 + 1);
    expect(s.invoices.at(-1)?.net).toBe(cost);
    expect(cost).toBe(5000);
  });

  it("contratto con scorte: +8% netPerMonth", () => {
    let s = createInitialGameState();
    s.supplyMonths = 2;
    const op = {
      id: 1,
      kind: "sale" as const,
      title: "Contratto · Test",
      net: 3000,
      expiresInMonths: 1,
      clientType: "private" as const,
      termMonths: 1,
      contractMonths: 3,
    };
    const next = acceptAsContract(s, op)!;
    expect(next.activeContracts![0]!.netPerMonth).toBe(round2((3000 / 3) * 1.08));
  });

  it("contratto senza scorte: nessun +8%", () => {
    let s = createInitialGameState();
    s.supplyMonths = 0;
    const op = {
      id: 1,
      kind: "sale" as const,
      title: "Contratto · Test",
      net: 3000,
      expiresInMonths: 1,
      clientType: "private" as const,
      termMonths: 1,
      contractMonths: 3,
    };
    const next = acceptAsContract(s, op)!;
    expect(next.activeContracts![0]!.netPerMonth).toBe(round2(3000 / 3));
  });
});
