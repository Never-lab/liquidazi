import { describe, expect, it } from "vitest";
import {
  BOARD_MAX_OPS,
  BOARD_MAX_OPS_BOOM,
  boardCapFor,
  clampSaleTarget,
  demandPopupForAdvance,
  generateOpportunities,
  refreshMarketBoard,
  regimeMult,
  rollDemandRegime,
} from "./events";
import { createInitialGameState } from "./types";

describe("demand regime helpers", () => {
  it("rollDemandRegime respects 20/60/20 buckets", () => {
    expect(rollDemandRegime(() => 0.0)).toBe("secca");
    expect(rollDemandRegime(() => 0.199)).toBe("secca");
    expect(rollDemandRegime(() => 0.2)).toBe("normale");
    expect(rollDemandRegime(() => 0.799)).toBe("normale");
    expect(rollDemandRegime(() => 0.8)).toBe("boom");
    expect(rollDemandRegime(() => 0.999)).toBe("boom");
  });

  it("regimeMult and boardCapFor match spec", () => {
    expect(regimeMult("secca")).toBe(0.15);
    expect(regimeMult("normale")).toBe(1);
    expect(regimeMult("boom")).toBe(1.35);
    expect(boardCapFor("secca")).toBe(BOARD_MAX_OPS);
    expect(boardCapFor("normale")).toBe(BOARD_MAX_OPS);
    expect(boardCapFor("boom")).toBe(BOARD_MAX_OPS_BOOM);
    expect(BOARD_MAX_OPS_BOOM).toBe(12);
  });

  it("clampSaleTarget bands", () => {
    expect(clampSaleTarget(10, "secca")).toBe(2);
    expect(clampSaleTarget(0.1, "secca")).toBe(0);
    expect(clampSaleTarget(0, "normale")).toBe(1);
    expect(clampSaleTarget(20, "boom")).toBe(12);
    expect(clampSaleTarget(0.2, "boom")).toBe(1);
  });
});

describe("generateOpportunities demand regimes", () => {
  const manyOperai = (count: number, idBase: number) =>
    Array.from({ length: count }, (_, i) => ({
      id: idBase + i,
      role: "Operaio",
      grossMonthly: 1500,
      hireMonthIdx: 0,
      tfrAccrued: 0,
      senioritySteps: 0,
    }));

  it("secca yields 0–2 sale ops", () => {
    const s = createInitialGameState();
    s.employees.push(...manyOperai(20, 1000));
    const { ops, demandRegime } = generateOpportunities(s, { forceRegime: "secca" });
    expect(demandRegime).toBe("secca");
    const sales = ops.filter((o) => o.kind === "sale");
    expect(sales.length).toBeGreaterThanOrEqual(0);
    expect(sales.length).toBeLessThanOrEqual(2);
  });

  it("boom fills boardCap 12 with high staff", () => {
    const s = createInitialGameState();
    s.employees.push(...manyOperai(30, 2000));
    s.company.reputation = 100;
    const { ops, demandRegime } = generateOpportunities(s, { forceRegime: "boom" });
    expect(demandRegime).toBe("boom");
    expect(ops.length).toBe(BOARD_MAX_OPS_BOOM);
  });

  it("refreshMarketBoard persists demandRegime", () => {
    let s = createInitialGameState();
    s = refreshMarketBoard(s);
    expect(["secca", "normale", "boom"]).toContain(s.demandRegime);
  });

  it("demandPopupForAdvance is edge-triggered", () => {
    expect(demandPopupForAdvance("running", "normale", "secca")).toBe("secca");
    expect(demandPopupForAdvance("running", "secca", "secca")).toBeNull();
    expect(demandPopupForAdvance("running", "boom", "normale")).toBeNull();
    expect(demandPopupForAdvance("running", "normale", "boom")).toBe("boom");
    expect(demandPopupForAdvance("lost", "normale", "secca")).toBeNull();
  });
});
