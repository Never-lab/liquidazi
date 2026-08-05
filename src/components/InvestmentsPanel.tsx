import { useState } from "react";
import {
  GROWTH_CAPACITY_CAP,
  GROWTH_PER_SLOT,
  MAX_SUBSIDIARIES,
  TREASURY_MIN,
  treasuryAnnualRate,
} from "../sim/actions";
import { formatCash } from "./formatCash";
import { useGameStore } from "../store/gameStore";
import styles from "./panels.module.css";

const RISK_LABEL = { low: "basso", med: "medio", high: "alto" } as const;

export const InvestmentsPanel = () => {
  const game = useGameStore((s) => s.game);
  const deposit = useGameStore((s) => s.depositTreasury);
  const withdraw = useGameStore((s) => s.withdrawTreasury);
  const grow = useGameStore((s) => s.investGrowth);
  const buy = useGameStore((s) => s.buyAcquisition);

  const [dep, setDep] = useState("2000");
  const [wd, setWd] = useState("1000");
  const [growth, setGrowth] = useState(String(GROWTH_PER_SLOT));

  const ratePct = (treasuryAnnualRate(game.monthsPlayed) * 100).toFixed(2);
  const treasury = game.treasury ?? 0;
  const invested = game.growthInvested ?? 0;
  const growthSlots = game.growthCapacityBonus ?? 0;
  const nextSlotAt = (growthSlots + 1) * GROWTH_PER_SLOT;
  const board = game.acquisitionBoard ?? [];
  const subs = game.subsidiaries ?? [];
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

      <h3 className={styles.panelTitle} style={{ marginTop: 16 }}>
        Acquisizioni ({subs.length}/{MAX_SUBSIDIARIES})
      </h3>
      <p className={styles.muted}>
        Portfolio lite: non è una seconda SRL fiscale. Tabellone si aggiorna ogni 3 mesi.
      </p>
      {subs.length > 0 && (
        <ul className={styles.list}>
          {subs.map((s) => (
            <li key={s.id}>
              <span>
                {s.name} · rischio {RISK_LABEL[s.risk]}
                {s.capacityBonus ? " · +1 slot" : ""}
              </span>
              <span>{formatCash(s.monthlyEbitda)}/mese</span>
            </li>
          ))}
        </ul>
      )}
      {board.length === 0 ? (
        <p className={styles.muted}>Nessun target aperto — avanza i mesi.</p>
      ) : (
        <div className={styles.cards}>
          {board.map((t) => (
            <article key={t.id} className={styles.deal}>
              <div>
                <h3 className={styles.dealTitle}>{t.name}</h3>
                <p className={styles.dealMeta}>
                  {t.sector} · {formatCash(t.price)} · EBITDA {formatCash(t.monthlyEbitda)}/mese ·
                  rischio {RISK_LABEL[t.risk]}
                  {t.capacityBonus ? " · +1 slot" : ""}
                </p>
              </div>
              <div className={styles.dealActions}>
                <button
                  className={styles.button}
                  disabled={
                    game.company.cash < t.price || subs.length >= MAX_SUBSIDIARIES
                  }
                  onClick={() => buy(t.id)}
                >
                  Acquista
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
