import { describe, expect, it } from "vitest";
import {
  STAFF_ROLES,
  baseGrossFor,
  capacityPointsFor,
  employerCostMonthly,
  grossWithSeniority,
} from "../config/staffPay";
import { fiscalYearSnapshot as snap } from "../config/fiscalYearSnapshot";
import { round2 } from "./types";
import { hireEmployee } from "./actions";
import { advanceMonth } from "./advanceMonth";
import { generateOpportunities, monthlyCapacity, staffCapacityPoints } from "./events";
import { createInitialGameState, toMonthIndex } from "./types";

describe("staffPay config", () => {
  it("tre ruoli con punti distinti", () => {
    expect(STAFF_ROLES.map((r) => r.role)).toEqual([
      "Operaio",
      "Impiegato",
      "Responsabile",
    ]);
    expect(capacityPointsFor("Operaio")).toBe(1);
    expect(capacityPointsFor("Impiegato")).toBe(0.35);
    expect(capacityPointsFor("Responsabile")).toBe(0.5);
  });

  it("lordo servizi Operaio 1650; scatto +4%", () => {
    expect(baseGrossFor("servizi", "Operaio")).toBe(1650);
    expect(grossWithSeniority(1650, 1)).toBeCloseTo(1650 * 1.04);
  });

  it("employerCostMonthly usa snapshot", () => {
    const g = 1650;
    const expected =
      g * (1 + snap.inps_employer_rate) + g * snap.tfr_accrual_factor;
    expect(employerCostMonthly(g)).toBe(round2(expected));
  });
});

describe("ruoli differenziati", () => {
  it("hire usa lordo settore", () => {
    let s = createInitialGameState({ city: "058091", sector: "servizi" });
    s = hireEmployee(s, "Operaio");
    expect(s.employees[0]!.grossMonthly).toBe(1650);
    expect(s.employees[0]!.senioritySteps).toBe(0);
  });

  it("1 Operaio dà più capacità di 1 Impiegato", () => {
    const base = createInitialGameState({ city: "058091", sector: "servizi" });
    const withOp = hireEmployee(base, "Operaio");
    const withImp = hireEmployee(base, "Impiegato");
    expect(monthlyCapacity(withOp)).toBeGreaterThan(monthlyCapacity(withImp));
    expect(staffCapacityPoints(withOp)).toBe(1);
    expect(staffCapacityPoints(withImp)).toBe(0.35);
  });

  it("1 Impiegato solo non aumenta monthlyCapacity (floor 0.35 → 0 slot)", () => {
    const base = createInitialGameState({ city: "058091", sector: "servizi" });
    const cap0 = monthlyCapacity(base);
    const withImp = hireEmployee(base, "Impiegato");
    expect(staffCapacityPoints(withImp)).toBe(0.35);
    expect(monthlyCapacity(withImp)).toBe(cap0);
    expect(monthlyCapacity(withImp) - cap0).toBe(0);
  });

  it("Impiegato alza i lead sale vs solo Operaio a parità di nextId seed", () => {
    let op = createInitialGameState({ city: "058091", sector: "servizi" });
    op = hireEmployee(op, "Operaio");
    let imp = createInitialGameState({ city: "058091", sector: "servizi" });
    imp = hireEmployee(imp, "Impiegato");
    // Force same board seed inputs
    op = { ...op, nextId: 50, monthsPlayed: 2 };
    imp = { ...imp, nextId: 50, monthsPlayed: 2 };
    const salesOp = generateOpportunities(op).ops.filter((o) => o.kind === "sale").length;
    const salesImp = generateOpportunities(imp).ops.filter((o) => o.kind === "sale").length;
    expect(salesImp).toBeGreaterThanOrEqual(salesOp);
  });
});

describe("advanceMonth: scatti anzianità + tick Responsabile", () => {
  it("dopo 24 mesi di servizio scatta +4% lordo", () => {
    let s = createInitialGameState({ city: "058091", sector: "servizi" });
    s = hireEmployee(s, "Operaio");
    const emp = s.employees[0]!;
    emp.hireMonthIdx = toMonthIndex(s.calendar) - 24;
    s.quietMode = true;
    s.company.cash = 100000;
    s = advanceMonth(s);
    expect(s.employees[0]!.senioritySteps).toBe(1);
    expect(s.employees[0]!.grossMonthly).toBeCloseTo(1650 * 1.04);
  });

  it("Responsabile: +2 compliance e −1 heat (al netto della deriva mensile del rivale)", () => {
    let s = createInitialGameState({ city: "058091", sector: "servizi" });
    s = hireEmployee(s, "Responsabile");
    s.compliance = 50;
    s.rival = { name: "Rival SA", heat: 40 };
    s.quietMode = true;
    s.company.cash = 100000;
    // No sales close this month, so the existing salesTaken===0 rival drift (+5)
    // still applies after our −1 tick: 40 − 1 + 5 = 44.
    s = advanceMonth(s);
    expect(s.compliance).toBe(52);
    expect(s.rival!.heat).toBe(44);
  });
});
