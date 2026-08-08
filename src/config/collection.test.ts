import { describe, expect, it } from "vitest";
import {
  MONTHLY_MORA_RATE,
  MONTHS_BEFORE_CARTELLA,
  RATEATION_FEE,
  RATEATION_MONTHS,
  ENFORCEMENT_AGGIO,
  ENFORCEMENT_MONTHS_TO_TERMINAL,
  TERMINAL_MONTHS_TO_LOST,
  LOST_THRESHOLD_FLOOR,
  lostThreshold,
} from "./collection";

describe("collection config", () => {
  it("locks v1 constants from spec", () => {
    expect(MONTHLY_MORA_RATE).toBe(0.01);
    expect(MONTHS_BEFORE_CARTELLA).toBe(6);
    expect(RATEATION_MONTHS).toBe(12);
    expect(RATEATION_FEE).toBe(0.1);
    expect(ENFORCEMENT_AGGIO).toBe(0.08);
    expect(ENFORCEMENT_MONTHS_TO_TERMINAL).toBe(4);
    expect(TERMINAL_MONTHS_TO_LOST).toBe(3);
    expect(LOST_THRESHOLD_FLOOR).toBe(2000);
  });

  it("lostThreshold uses max(floor, 5% ytd)", () => {
    expect(lostThreshold(0)).toBe(2000);
    expect(lostThreshold(100_000)).toBe(5000);
  });
});
