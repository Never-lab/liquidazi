import { getProjectDef } from "../config/projects";
import {
  UPGRADE_LEVELS,
  UPGRADE_LIST,
  upgradeLevel,
  type UpgradeId,
} from "../config/upgrades";
import { upgradeCost } from "../sim/actions";
import { migrateUpgradeState } from "../sim/migrateUpgrades";
import { useGameStore } from "../store/gameStore";
import { formatCash } from "./formatCash";
import styles from "./panels.module.css";

export const UpgradesPanel = () => {
  const game = useGameStore((s) => s.game);
  const buy = useGameStore((s) => s.buyUpgrade);
  const levels = migrateUpgradeState(game);

  const active = game.activeProject;

  return (
    <section className={styles.panel}>
      {active && (
        <p className={styles.muted}>
          Progetto: {getProjectDef(active.id).label} · {active.monthsLeft} mesi
        </p>
      )}
      <h2 className={styles.panelTitle}>Upgrade azienda</h2>
      <p className={styles.muted}>
        Potenzia i quattro pilastri fino al Lv3 — non finiscono dopo il primo acquisto.
      </p>
      <ul className={styles.list}>
        {UPGRADE_LIST.map((u) => {
          const lv = upgradeLevel(levels, u.id);
          const blurbIdx = Math.max(0, lv - 1);
          const currentBlurb = UPGRADE_LEVELS[u.id][blurbIdx]!.blurb;
          const blurbText =
            lv === 0
              ? `Prossimo: ${currentBlurb}`
              : lv < 3
                ? `${currentBlurb} Prossimo: ${UPGRADE_LEVELS[u.id][lv]!.blurb}`
                : currentBlurb;
          const cost = upgradeCost(game, u.id);
          const atMax = lv >= 3;
          const canBuy = !atMax && game.company.cash >= cost;
          const action = lv === 0 ? "Acquista" : "Potenzia";
          return (
            <li key={u.id} style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <strong>{u.label}</strong>
                <span>Lv {lv} / 3</span>
              </div>
              <span className={styles.muted}>{blurbText}</span>
              {atMax ? (
                <span className={styles.muted}>Max Lv3</span>
              ) : (
                <button
                  className={styles.buttonSecondary}
                  disabled={!canBuy}
                  title={!canBuy ? "Cassa insufficiente" : undefined}
                  onClick={() => buy(u.id as UpgradeId)}
                >
                  {`${action} · ${formatCash(cost)}`}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};
