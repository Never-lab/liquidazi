import { describe, expect, it } from "vitest";
import {
  hasUpgrade,
  upgradeLevel,
  nextUpgradeLevel,
  type UpgradeLevels,
} from "./upgrades";

describe("upgrade levels helpers", () => {
  it("defaults to 0; hasUpgrade false", () => {
    expect(upgradeLevel(undefined, "processi")).toBe(0);
    expect(hasUpgrade(undefined, "processi")).toBe(false);
  });

  it("reads level and next", () => {
    const levels: UpgradeLevels = { processi: 2 };
    expect(upgradeLevel(levels, "processi")).toBe(2);
    expect(hasUpgrade(levels, "processi")).toBe(true);
    expect(nextUpgradeLevel(levels, "processi")).toBe(3);
    expect(nextUpgradeLevel({ processi: 3 }, "processi")).toBeNull();
  });
});
