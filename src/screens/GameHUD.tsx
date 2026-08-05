import { useState } from "react";
import { ChartsPanel } from "../components/Charts";
import { EventFeed } from "../components/EventFeed";
import { LoanPanel } from "../components/LoanPanel";
import { OpportunitiesPanel } from "../components/OpportunitiesPanel";
import { PayrollPanel } from "../components/PayrollPanel";
import { ReportPanel } from "../components/ReportPanel";
import { TaxPanel } from "../components/TaxPanel";
import { formatCash } from "../components/formatCash";
import { cityById } from "../config/market";
import { marketModifiersFromIndex } from "../sim/market";
import { useGameStore } from "../store/gameStore";
import styles from "./GameHUD.module.css";

const MESI = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

export const GameHUD = () => {
  const game = useGameStore((s) => s.game);
  const doAdvanceMonth = useGameStore((s) => s.advanceMonth);
  const setScreen = useGameStore((s) => s.setScreen);
  const [opsOpen, setOpsOpen] = useState(false);
  const city = cityById(game.company.city);
  const mods = marketModifiersFromIndex(game.company.densityIndex);
  const due = game.liabilities.filter((l) => !l.paid).reduce((s, l) => s + l.amount, 0);

  return (
    <div className={styles.hud}>
      <header className={styles.hero}>
        <div>
          <p className={styles.kicker}>{city.label} · {city.regionLabel}</p>
          <h2 className={styles.heroTitle}>{game.company.name}</h2>
          <p className={styles.heroSub}>
            {MESI[game.calendar.month - 1]} {game.calendar.year}
            {" · "}mese {game.monthsPlayed + 1}/24
            {" · "}pressione {mods.pressureLabel}
          </p>
        </div>
        <div className={styles.heroStats}>
          <div>
            <span className={styles.statLabel}>Cassa</span>
            <strong className={styles.statValue}>{formatCash(game.company.cash)}</strong>
          </div>
          <div>
            <span className={styles.statLabel}>F24 aperti</span>
            <strong className={styles.statValue}>{formatCash(due)}</strong>
          </div>
          <button className={styles.advanceButton} onClick={doAdvanceMonth}>
            Chiudi il mese →
          </button>
        </div>
      </header>

      <ChartsPanel history={game.history} />
      <OpportunitiesPanel />
      <EventFeed />

      <div className={styles.opsToggle}>
        <button className={styles.linkish} onClick={() => setOpsOpen((v) => !v)}>
          {opsOpen ? "Nascondi operazioni" : "Personale · Fisco · Credito · Bilancio"}
        </button>
        <button className={styles.linkish} onClick={() => setScreen("menu")}>Menu</button>
      </div>

      {opsOpen && (
        <div className={styles.ops}>
          <PayrollPanel />
          <TaxPanel />
          <LoanPanel />
          <ReportPanel />
        </div>
      )}
    </div>
  );
};
