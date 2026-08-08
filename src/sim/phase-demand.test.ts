import { describe, expect, it } from "vitest";
import {
  BOARD_MAX_OPS,
  BOARD_MAX_OPS_BOOM,
  boardCapFor,
  clampSaleTarget,
  regimeMult,
  rollDemandRegime,
} from "./events";

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
