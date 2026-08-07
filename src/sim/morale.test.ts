import { describe, expect, it } from "vitest";
import { advanceMonth } from "./advanceMonth";
import { hireEmployee } from "./actions";
import { monthlyCapacity, staffCapacityPoints } from "./events";
import {
  applyMoraleDrift,
  clampMorale,
  rollStaffResignation,
} from "./morale";
import { createInitialGameState, toMonthIndex } from "./types";

describe("staffMorale", () => {
  it("defaults to 70 on new game", () => {
    const s = createInitialGameState();
    expect(s.staffMorale).toBe(70);
  });

  it("clamps 0–100", () => {
    expect(clampMorale(-5)).toBe(0);
    expect(clampMorale(150)).toBe(100);
    expect(clampMorale(70)).toBe(70);
  });

  it("first Operaio at morale 70 keeps 1 effective slot (slots after soft-cap, not points)", () => {
    let s = createInitialGameState();
    const base = monthlyCapacity(s);
    s = hireEmployee(s, "Operaio");
    expect(staffCapacityPoints(s)).toBe(1);
    expect(s.staffMorale).toBe(70);
    expect(monthlyCapacity(s)).toBe(base + 1);
  });

  it("drift: cash negative −4; profitable close +2", () => {
    let s = createInitialGameState();
    s.staffMorale = 50;
    s.company.cash = -100;
    s = applyMoraleDrift(s);
    expect(s.staffMorale).toBe(46);

    s.company.cash = 5000;
    s.lastCloseSummary = { cashBefore: 4000, cashAfter: 5000, delta: 1000, lines: [] };
    s = applyMoraleDrift(s);
    expect(s.staffMorale).toBe(48);
  });

  it("drift: formazione +3, Responsabile +1", () => {
    let s = createInitialGameState();
    s.staffMorale = 50;
    s.company.cash = 5000;
    s.lastCloseSummary = { cashBefore: 5000, cashAfter: 5000, delta: 0, lines: [] };
    s.activeProject = { id: "formazione", monthsLeft: 2, frozenCash: 0 };
    s = hireEmployee(s, "Responsabile");
    s = applyMoraleDrift(s);
    expect(s.staffMorale).toBe(56);
  });

  it("rollStaffResignation removes employee when morale low and rand hits", () => {
    let s = createInitialGameState();
    s = hireEmployee(s, "Operaio");
    s.staffMorale = 10;
    const before = s.employees.length;
    s = rollStaffResignation(s, () => 0.05);
    expect(s.employees.length).toBe(before - 1);
    expect(s.log.some((e) => e.tone === "bad" && e.text.includes("Dimissioni"))).toBe(true);
  });

  it("rollStaffResignation no-op when morale >= 30", () => {
    let s = createInitialGameState();
    s = hireEmployee(s, "Operaio");
    s.staffMorale = 30;
    s = rollStaffResignation(s, () => 0);
    expect(s.employees.length).toBe(1);
  });

  it("advanceMonth applies F24 penalty morale −3 once even with multiple liabilities", () => {
    let s = createInitialGameState();
    s.quietMode = true;
    s.staffMorale = 70;
    const dueIdx = toMonthIndex(s.calendar);
    s.liabilities.push(
      {
        id: 99,
        kind: "IVA",
        amount: 500,
        dueIdx,
        paid: false,
        penalized: false,
      },
      {
        id: 100,
        kind: "INPS",
        amount: 300,
        dueIdx,
        paid: false,
        penalized: false,
      },
    );
    s = advanceMonth(s);
    expect(s.staffMorale).toBe(69);
  });

  it("advanceMonth applies F24 penalty morale −3 (net with flat-month drift +2)", () => {
    let s = createInitialGameState();
    s.quietMode = true;
    s.staffMorale = 70;
    s.liabilities.push({
      id: 99,
      kind: "IVA",
      amount: 500,
      dueIdx: toMonthIndex(s.calendar),
      paid: false,
      penalized: false,
    });
    s = advanceMonth(s);
    expect(s.staffMorale).toBe(69);
  });

  it("formazione final month: +3 morale even after project completes", () => {
    let s = createInitialGameState();
    s.quietMode = true;
    s.staffMorale = 50;
    s.company.cash = 5000;
    s.activeProject = { id: "formazione", monthsLeft: 1, frozenCash: 0 };
    s = advanceMonth(s);
    expect(s.activeProject).toBeNull();
    expect(s.staffMorale).toBe(55);
  });

  it("6 operai: morale scales slots after soft-cap (not raw points)", () => {
    let s = createInitialGameState({ city: "058091", sector: "servizi" });
    const base = monthlyCapacity(s);
    for (let i = 0; i < 6; i++) s = hireEmployee(s, "Operaio");
    expect(monthlyCapacity(s)).toBe(base + 6);
    s.staffMorale = 0;
    expect(monthlyCapacity(s)).toBe(base + 5);
    s.staffMorale = 100;
    expect(monthlyCapacity(s)).toBe(base + 6);
  });

  it("15 operai: softer cap floor(extra/2) beats old curve", () => {
    let s = createInitialGameState({ city: "058091", sector: "servizi" });
    s.staffMorale = 100;
    const base = monthlyCapacity(s);
    for (let i = 0; i < 15; i++) s = hireEmployee(s, "Operaio");
    expect(monthlyCapacity(s)).toBe(base + 11);
  });
});
