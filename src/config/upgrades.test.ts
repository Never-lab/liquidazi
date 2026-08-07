import { describe, expect, it } from "vitest";
import {
  hasUpgrade,
  upgradeLevel,
  nextUpgradeLevel,
  UPGRADES,
  type UpgradeLevels,
} from "./upgrades";
import { upgradeCost } from "../sim/actions";
import { createInitialGameState } from "../sim/types";

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

  it("clamps corrupt levels to 0..3", () => {
    expect(upgradeLevel({ processi: 99 as never }, "processi")).toBe(3);
    expect(upgradeLevel({ processi: -2 as never }, "processi")).toBe(0);
    expect(upgradeLevel({ processi: 2.9 as never }, "processi")).toBe(2);
  });

  it("upgradeCost applies level multipliers for flat upgrades", () => {
    let s = createInitialGameState();
    expect(upgradeCost(s, "processi")).toBe(UPGRADES.processi.cost);
    s.upgradeLevels = { processi: 1 };
    expect(upgradeCost(s, "processi")).toBe(Math.round(UPGRADES.processi.cost * 1.8));
    s.upgradeLevels = { processi: 2 };
    expect(upgradeCost(s, "processi")).toBe(Math.round(UPGRADES.processi.cost * 2.6));
  });
});
