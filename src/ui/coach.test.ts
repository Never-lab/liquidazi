import { describe, expect, it } from "vitest";
import { createInitialGameState } from "../sim/types";
import { coachTipFor } from "./coach";

describe("coachTipFor commesse-legend", () => {
  it("shows after month 0 loop tips when monthsPlayed is 1–2 and no F24 due", () => {
    const s = createInitialGameState();
    s.monthsPlayed = 1;
    s.liabilities = [];
    const tip = coachTipFor(s);
    expect(tip?.id).toBe("commesse-legend");
    expect(tip?.title).toMatch(/commesse/i);
  });

  it("does not override F24 tip when liabilities are unpaid", () => {
    const s = createInitialGameState();
    s.monthsPlayed = 1;
    s.liabilities = [
      {
        id: 1,
        kind: "IVA",
        amount: 100,
        dueIdx: 2024 * 12 + 1,
        paid: false,
        penalized: false,
      },
    ];
    expect(coachTipFor(s)?.id).toBe("f24");
  });

  it("does not show on month 0 (first-deal wins)", () => {
    const s = createInitialGameState();
    s.monthsPlayed = 0;
    s.invoices = [];
    expect(coachTipFor(s)?.id).toBe("first-deal");
  });

  it("shows at monthsPlayed 2 with no liabilities", () => {
    const s = createInitialGameState();
    s.monthsPlayed = 2;
    s.liabilities = [];
    expect(coachTipFor(s)?.id).toBe("commesse-legend");
  });

  it("does not show at monthsPlayed 3 when hire tip wins", () => {
    const s = createInitialGameState();
    s.monthsPlayed = 3;
    s.liabilities = [];
    s.employees = [];
    expect(coachTipFor(s)?.id).not.toBe("commesse-legend");
    expect(coachTipFor(s)?.id).toBe("hire");
  });

  it("shows staff-clima when morale is low with employees", () => {
    const s = createInitialGameState();
    s.monthsPlayed = 4;
    s.liabilities = [];
    s.employees = [
      {
        id: 1,
        role: "Operaio",
        grossMonthly: 1800,
        hireMonthIdx: 2024 * 12,
        senioritySteps: 0,
        tfrAccrued: 0,
      },
    ];
    s.staffMorale = 35;
    expect(coachTipFor(s)?.id).toBe("staff-clima");
  });
});

describe("coachTipFor offer-types", () => {
  it("shows when board has contract and monthsPlayed 2–4", () => {
    const s = createInitialGameState();
    s.monthsPlayed = 2;
    s.liabilities = [];
    s.opportunities = [
      {
        id: 1,
        kind: "sale",
        title: "Contratto · Demo",
        net: 3000,
        expiresInMonths: 1,
        termMonths: 1,
        contractMonths: 3,
        marketLayer: "local",
      },
    ];
    expect(coachTipFor(s)?.id).toBe("offer-types");
  });

  it("does not override commesse-legend when no contract on board", () => {
    const s = createInitialGameState();
    s.monthsPlayed = 2;
    s.liabilities = [];
    s.opportunities = [
      {
        id: 1,
        kind: "sale",
        title: "Commessa · Demo",
        net: 2000,
        expiresInMonths: 1,
        termMonths: 2,
        marketLayer: "local",
      },
    ];
    expect(coachTipFor(s)?.id).toBe("commesse-legend");
  });
});
