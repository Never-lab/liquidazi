import { describe, expect, it } from "vitest";
import { HOLDING_SLOT_BASE, HOLDING_SLOT_MAX } from "./holding";

describe("holding config", () => {
  it("slot band is 4..8", () => {
    expect(HOLDING_SLOT_BASE).toBe(4);
    expect(HOLDING_SLOT_MAX).toBe(8);
  });
});
