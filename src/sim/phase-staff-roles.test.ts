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
import { generateOpportunities, monthlyCapacity, staffCapacityPoints } from "./events";
import { createInitialGameState } from "./types";

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
