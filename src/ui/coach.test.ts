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
});
