import { useState } from "react";
import {
  GROWTH_CAPACITY_CAP,
  GROWTH_PER_SLOT,
  TREASURY_MIN,
  treasuryAnnualRate,
} from "../sim/actions";
import { formatCash } from "./formatCash";
import { useGameStore } from "../store/gameStore";
import styles from "./panels.module.css";

export const InvestmentsPanel = () => {
  const game = useGameStore((s) => s.game);
  const deposit = useGameStore((s) => s.depositTreasury);
  const withdraw = useGameStore((s) => s.withdrawTreasury);
  const grow = useGameStore((s) => s.investGrowth);

  const [dep, setDep] = useState("2000");
  const [wd, setWd] = useState("1000");
  const [growth, setGrowth] = useState(String(GROWTH_PER_SLOT));

  const ratePct = (treasuryAnnualRate(game.monthsPlayed) * 100).toFixed(2);
  const treasury = game.treasury ?? 0;
  const invested = game.growthInvested ?? 0;
  const growthSlots = game.growthCapacityBonus ?? 0;
  const nextSlotAt = (growthSlots + 1) * GROWTH_PER_SLOT;
  const profitHint =
    (game.lastYearReport?.profit ?? 0) > 0
      ? "Utile dell'anno scorso positivo: ha senso parcheggiare o reinvestire."
      : "Puoi usare la cassa anche senza utile chiuso (modello educativo).";

  return (
    <section className={styles.panelWide}>
      <h2 className={styles.panelTitle}>Investimenti</h2>
      <p className={styles.muted}>{profitHint}</p>

      <h3 className={styles.panelTitle} style={{ marginTop: 12 }}>
        Tesoreria
      </h3>
      <ul className={styles.list}>
        <li>
          <span>Saldo deposito</span>
          <span>{formatCash(treasury)}</span>
        </li>
        <li>
          <span>Tasso indicativo</span>
          <span>{ratePct}% annuo</span>
        </li>
      </ul>
      <div className={styles.row}>
        <input
          className={styles.input}
          type="number"
          min={TREASURY_MIN}
          value={dep}
          onChange={(e) => setDep(e.target.value)}
          aria-label="Importo deposito"
        />
        <button
          className={styles.buttonSecondary}
          disabled={Number(dep) < TREASURY_MIN || game.company.cash < Number(dep)}
          onClick={() => deposit(Number(dep))}
        >
          Deposita
        </button>
      </div>
      <div className={styles.row}>
        <input
          className={styles.input}
          type="number"
          min={0}
          value={wd}
          onChange={(e) => setWd(e.target.value)}
          aria-label="Importo prelievo"
        />
        <button
          className={styles.buttonSecondary}
          disabled={!(Number(wd) > 0) || Number(wd) > treasury}
          onClick={() => withdraw(Number(wd))}
        >
          Preleva
        </button>
      </div>

      <h3 className={styles.panelTitle} style={{ marginTop: 16 }}>
        Reinvestimento crescita
      </h3>
      <p className={styles.muted}>
        Ogni {formatCash(GROWTH_PER_SLOT)} → +1 slot (max {GROWTH_CAPACITY_CAP}). Investito{" "}
        {formatCash(invested)} · slot {growthSlots}/{GROWTH_CAPACITY_CAP}
        {growthSlots < GROWTH_CAPACITY_CAP
          ? ` · prossimo a ${formatCash(nextSlotAt)}`
          : " · tetto raggiunto"}
      </p>
      <div className={styles.row}>
        <input
          className={styles.input}
          type="number"
          min={GROWTH_PER_SLOT}
          value={growth}
          onChange={(e) => setGrowth(e.target.value)}
          aria-label="Importo crescita"
        />
        <button
          className={styles.button}
          disabled={
            Number(growth) < GROWTH_PER_SLOT ||
            game.company.cash < Number(growth) ||
            growthSlots >= GROWTH_CAPACITY_CAP
          }
          onClick={() => grow(Number(growth))}
        >
          Investi
        </button>
      </div>
    </section>
  );
};
