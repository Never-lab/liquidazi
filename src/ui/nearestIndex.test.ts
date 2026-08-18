import { describe, expect, it } from "vitest";
import { nearestIndex } from "./nearestIndex";

describe("nearestIndex", () => {
  it("picks the closest x", () => {
    expect(nearestIndex([10, 50, 90], 12)).toBe(0);
    expect(nearestIndex([10, 50, 90], 48)).toBe(1);
    expect(nearestIndex([10, 50, 90], 88)).toBe(2);
  });

  it("empty is -1", () => {
    expect(nearestIndex([], 0)).toBe(-1);
  });
});
