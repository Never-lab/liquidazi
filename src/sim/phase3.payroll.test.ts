import { describe, expect, it } from "vitest";
import { fiscalYearSnapshot as snap } from "../config/fiscalYearSnapshot";
import { advanceMonth } from "./advanceMonth";
import { fireEmployee, hireEmployee, PRESET_ROLES } from "./actions";
import { createInitialGameState, round2, type GameState } from "./types";

const withEmployee = (gross: number): GameState => {
  const s = createInitialGameState();
  return {
    ...s,
    employees: [
      {
        id: s.nextId,
        role: "Test",
        grossMonthly: gross,
        hireMonthIdx: 2024 * 12,
        tfrAccrued: 0,
        senioritySteps: 0,
      },
    ],
    nextId: s.nextId + 1,
  };
};

describe("Phase 3 — cedolino semplificato", () => {
  it("gross 2000 → netto, contributi e IRPEF coerenti con lo snapshot", () => {
    let s = withEmployee(2000);
    const cash0 = s.company.cash;

    const inpsEmployee = round2(2000 * snap.inps_employee_rate);
    const irpef = round2(2000 * snap.irpef_withholding_simplified_rate);
    const net = round2(2000 - inpsEmployee - irpef);
    const inpsEmployer = round2(2000 * snap.inps_employer_rate);
    const tfr = round2(2000 * snap.tfr_accrual_factor);

    s = advanceMonth(s);

    expect(s.company.cash).toBeCloseTo(cash0 - net);
    expect(s.lastPayroll?.totalNet).toBeCloseTo(net);

    const irpefL = s.liabilities.find((l) => l.kind === "IRPEF");
    const inpsL = s.liabilities.find((l) => l.kind === "INPS");
    expect(irpefL?.amount).toBeCloseTo(irpef);
    expect(inpsL?.amount).toBeCloseTo(round2(inpsEmployee + inpsEmployer));
    expect(s.tfrFund).toBeCloseTo(tfr);
  });

  it("le liability F24 hanno scadenza il mese successivo", () => {
    let s = withEmployee(2000);
    s = advanceMonth(s);
    for (const l of s.liabilities) {
      expect(l.dueIdx).toBe(2024 * 12 + 0 + 1);
    }
  });

  it("senza dipendenti niente cedolino", () => {
    let s = createInitialGameState();
    s = advanceMonth(s);
    expect(s.lastPayroll).toBeNull();
    expect(s.liabilities).toHaveLength(0);
  });

  it("assunzione e licenziamento aggiornano l'organico", () => {
    let s = createInitialGameState();
    s = hireEmployee(s, PRESET_ROLES[0].role);
    expect(s.employees).toHaveLength(1);
    expect(s.employees[0].grossMonthly).toBe(PRESET_ROLES[0].grossMonthly);

    s = fireEmployee(s, s.employees[0].id);
    expect(s.employees).toHaveLength(0);
  });

  it("il TFR si accumula mese dopo mese", () => {
    let s = withEmployee(2000);
    s = advanceMonth(s);
    s = advanceMonth(s);
    expect(s.tfrFund).toBeCloseTo(round2(2000 * snap.tfr_accrual_factor) * 2);
  });
});
