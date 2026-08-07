import { describe, expect, it } from "vitest";
import { migrateUpgradeState } from "./migrateUpgrades";

describe("migrateUpgradeState", () => {
  it("maps legacy upgrades[] to level 1", () => {
    expect(
      migrateUpgradeState({ upgrades: ["processi", "sede"], upgradeLevels: undefined }),
    ).toEqual({ processi: 1, sede: 1 });
  });

  it("prefers existing upgradeLevels", () => {
    expect(
      migrateUpgradeState({
        upgrades: ["processi"],
        upgradeLevels: { processi: 3 },
      }),
    ).toEqual({ processi: 3 });
  });

  it("empty legacy → empty levels", () => {
    expect(migrateUpgradeState({ upgrades: [], upgradeLevels: undefined })).toEqual({});
  });
});
