import { UPGRADE_LIST, type UpgradeId } from "../config/upgrades";
import { upgradeCost } from "../sim/actions";
import { useGameStore } from "../store/gameStore";
import { formatCash } from "./formatCash";
import styles from "./panels.module.css";

export const UpgradesPanel = () => {
  const game = useGameStore((s) => s.game);
  const buy = useGameStore((s) => s.buyUpgrade);
  const owned = game.upgrades ?? [];

  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Upgrade azienda</h2>
      <p className={styles.muted}>
        Investimenti una tantum: automazione F24, commerciale, sede, processi.
      </p>
      <ul className={styles.list}>
        {UPGRADE_LIST.map((u) => {
          const have = owned.includes(u.id);
          const cost = upgradeCost(game, u.id);
          const canBuy = !have && game.company.cash >= cost;
          return (
            <li key={u.id} style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <strong>{u.label}</strong>
                <span>{have ? "Attivo" : formatCash(cost)}</span>
              </div>
              <span className={styles.muted}>{u.blurb}</span>
              {!have && (
                <button
                  className={styles.buttonSecondary}
                  disabled={!canBuy}
                  onClick={() => buy(u.id as UpgradeId)}
                >
                  {canBuy ? "Acquista" : "Cassa insufficiente"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};
