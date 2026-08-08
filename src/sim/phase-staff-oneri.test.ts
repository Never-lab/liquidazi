import { describe, expect, it } from "vitest";
import { totalAnnualStaffOneri } from "../config/staffPay";
import { advanceMonth } from "./advanceMonth";
import { createInitialGameState } from "./types";

describe("oneri annuali personale a dicembre", () => {
  it("addebita oneri e li mette nel report", () => {
    let state = createInitialGameState();
    state.quietMode = true;
    state.calendar = { month: 12, year: 2024 };
    state.company.cash = 50_000;
    state.employees = [
      {
        id: 1,
        role: "Operaio",
        grossMonthly: 1650,
        hireMonthIdx: 2024 * 12 + 11,
        tfrAccrued: 0,
        senioritySteps: 0,
      },
      {
        id: 2,
        role: "Operaio",
        grossMonthly: 1650,
        hireMonthIdx: 2024 * 12 + 11,
        tfrAccrued: 0,
        senioritySteps: 0,
      },
    ];

    const expected = totalAnnualStaffOneri(state.employees);
    expect(expected).toBeGreaterThan(0);

    state = advanceMonth(state);

    expect(state.lastYearReport?.staffAnnualOneri).toBe(expected);
    expect(state.lastYearReport!.otherCosts).toBeGreaterThanOrEqual(expected);
  });

  it("registra zero oneri senza dipendenti", () => {
    let state = createInitialGameState();
    state.quietMode = true;
    state.calendar = { month: 12, year: 2024 };
    state.employees = [];
    state.company.cash = 20_000;

    state = advanceMonth(state);

    expect(state.lastYearReport?.staffAnnualOneri ?? 0).toBe(0);
  });
});
