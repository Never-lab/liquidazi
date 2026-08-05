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
