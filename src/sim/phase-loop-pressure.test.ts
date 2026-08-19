import { describe, expect, it } from "vitest";
import { acceptOpportunity, monthlyCapacity, seedNewGame } from "./events";
import { tickContracts } from "./contracts";
import { rollPressure, shouldRollPressure, tickPressure } from "./pressures";
import { applyRivalSteal, seedRival } from "./rival";
import { createInitialGameState } from "./types";
import { hireEmployee } from "./actions";

const base = () => {
  let s = createInitialGameState({
    name: "Test SRL",
    sector: "servizi",
    city: "058091", // Roma
    difficulty: "normal",
  });
  s = seedNewGame(s);
  return s;
};

describe("pressures", () => {
  it("roll setta monthsLeft=3; tick decrementa", () => {
    let s = createInitialGameState({
      name: "P",
      sector: "servizi",
      city: "058091",
      difficulty: "normal",
    });
    s.calendar = { month: 1, year: 2026 };
    s.quietMode = false;
    expect(shouldRollPressure(s)).toBe(true);
    s = rollPressure(s);
    expect(s.quarterPressure?.monthsLeft).toBe(3);
    s = tickPressure(s);
    expect(s.quarterPressure?.monthsLeft).toBe(2);
  });

  it("hiring_freeze blocca assunzioni", () => {
    let s = base();
    s.quarterPressure = {
      id: "hiring_freeze",
      label: "Blocco assunzioni",
      monthsLeft: 2,
    };
    const before = s.employees.length;
    s = hireEmployee(s, "Operaio");
    expect(s.employees.length).toBe(before);
  });
});

describe("contracts", () => {
  it("accept riduce capacity; dopo 3 tick sparisce", () => {
    let s = createInitialGameState();
    s.quietMode = true;
    s.activeContracts = [];
    s.company.reputation = 50;
    s.opportunities = [
      {
        id: 99,
        kind: "sale",
        title: "Contratto · Demo",
        net: 900,
        expiresInMonths: 1,
        clientType: "private",
        termMonths: 1,
        contractMonths: 3,
      },
    ];
    const cap0 = monthlyCapacity(s);
    expect(cap0).toBeGreaterThan(0);
    s = acceptOpportunity(s, 99);
    expect(s.activeContracts).toHaveLength(1);
    expect(monthlyCapacity(s)).toBe(cap0 - 1);

    for (let i = 0; i < 3; i++) s = tickContracts(s);
    expect(s.activeContracts).toHaveLength(0);
  });
});

describe("rival", () => {
  it("con heat alto può rubare una sale dal board", () => {
    let s = base();
    s.quietMode = false;
    s.rival = { ...seedRival(s), heat: 90 };
    const salesBoard = [
      {
        id: 1,
        kind: "sale" as const,
        title: "Commessa · Target",
        net: 1000,
        expiresInMonths: 1,
        clientType: "private" as const,
        termMonths: 1,
      },
      {
        id: 3,
        kind: "sale" as const,
        title: "Commessa · Altra",
        net: 1200,
        expiresInMonths: 1,
        clientType: "private" as const,
        termMonths: 1,
      },
      {
        id: 2,
        kind: "supply" as const,
        title: "Fornitura · X",
        net: 500,
        expiresInMonths: 1,
        termMonths: 1,
      },
    ];
    let stolen = false;
    for (let m = 0; m < 40; m++) {
      s.monthsPlayed = m;
      const board = applyRivalSteal({ ...s, opportunities: salesBoard });
      const salesLeft = board.opportunities.filter((o) => o.kind === "sale");
      if (salesLeft.length === 1) {
        stolen = true;
        expect(board.log[0]?.text).toMatch(/preso/);
        break;
      }
    }
    expect(stolen).toBe(true);
  });
});
