import type { UpgradeId, UpgradeLevels } from "../config/upgrades";

export const migrateUpgradeState = (
  game: Pick<{ upgrades?: UpgradeId[]; upgradeLevels?: UpgradeLevels }, "upgrades" | "upgradeLevels">,
): UpgradeLevels => {
  if (game.upgradeLevels && Object.keys(game.upgradeLevels).length > 0) {
    return { ...game.upgradeLevels };
  }
  const levels: UpgradeLevels = {};
  for (const id of game.upgrades ?? []) {
    levels[id] = 1;
  }
  return levels;
};
