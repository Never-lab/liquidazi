import { useState } from "react";
import { ChartsPanel } from "../components/Charts";
import { CoachBanner } from "../components/CoachBanner";
import { EventFeed } from "../components/EventFeed";
import { LoanPanel } from "../components/LoanPanel";
import { OpportunitiesPanel } from "../components/OpportunitiesPanel";
import { PayrollPanel } from "../components/PayrollPanel";
import { ReportPanel } from "../components/ReportPanel";
import { TaxPanel } from "../components/TaxPanel";
import { formatCash } from "../components/formatCash";
import { DIFFICULTIES } from "../config/difficulty";
import { cityById } from "../config/market";
import { LOSE_MONTHS_BELOW_ZERO } from "../sim/types";
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
  const acceptOffer = useGameStore((s) => s.acceptLoanOffer);
  const declineOffer = useGameStore((s) => s.declineLoanOffer);
  const setScreen = useGameStore((s) => s.setScreen);
  const coachOn = useGameStore((s) => s.coachOn);
  const enableCoach = useGameStore((s) => s.enableCoach);
  const [opsOpen, setOpsOpen] = useState(false);
  const [cashPulse, setCashPulse] = useState(0);
  const city = cityById(game.company.city);
  const mods = marketModifiersFromIndex(game.company.densityIndex);
  const due = game.liabilities.filter((l) => !l.paid).reduce((s, l) => s + l.amount, 0);
  const offer = game.loanOffer;
  const diffLabel = DIFFICULTIES[game.difficulty ?? "normal"].label;

  const closeMonth = () => {
    doAdvanceMonth();
    setCashPulse((n) => n + 1);
  };

  return (
    <div className={styles.hud}>
      <header className={styles.hero}>
        <div>
          <p className={styles.kicker}>
            {city.label} · {city.regionLabel} · {diffLabel}
          </p>
          <h2 className={styles.heroTitle}>{game.company.name}</h2>
          <p className={styles.heroSub}>
            {MESI[game.calendar.month - 1]} {game.calendar.year}
            {" · "}mese {game.monthsPlayed + 1}
            {" · "}pressione {mods.pressureLabel}
            {" · "}rep {Math.round(game.company.reputation)}
            {game.monthsBelowZero > 0
              ? ` · rosso ${game.monthsBelowZero}/${LOSE_MONTHS_BELOW_ZERO}`
              : ""}
          </p>
        </div>
        <div className={styles.heroStats}>
          <div key={cashPulse} className={styles.statPulse}>
            <span className={styles.statLabel}>Cassa</span>
            <strong
              className={`${styles.statValue} ${game.company.cash < 0 ? styles.cashBad : ""}`}
            >
              {formatCash(game.company.cash)}
            </strong>
          </div>
          <div>
            <span className={styles.statLabel}>F24 aperti</span>
            <strong className={`${styles.statValue} ${due > 0 ? styles.dueWarn : ""}`}>
              {formatCash(due)}
            </strong>
          </div>
          <button className={styles.advanceButton} onClick={closeMonth}>
            Chiudi il mese →
          </button>
        </div>
      </header>

      <CoachBanner />

      {offer && (
        <div className={styles.rescue} role="alert">
          <p>
            <strong>Difficoltà di cassa.</strong> La banca propone un prestito di{" "}
            {formatCash(offer.principal)} a {offer.tenorMonths} mesi
            {offer.guarantee === "fondo_garanzia_pmi" ? " (con Fondo PMI)" : ""}.
            Se resti in rosso {LOSE_MONTHS_BELOW_ZERO} mesi di fila sei KO.
          </p>
          <div className={styles.rescueActions}>
            <button className={styles.advanceButton} onClick={acceptOffer}>
              Accetta prestito
            </button>
            <button className={styles.linkish} onClick={declineOffer}>
              Rifiuta
            </button>
          </div>
        </div>
      )}

      <ChartsPanel history={game.history} />
      <OpportunitiesPanel />
      <EventFeed />

      <div className={styles.opsToggle}>
        <button className={styles.linkish} onClick={() => setOpsOpen((v) => !v)}>
          {opsOpen ? "Nascondi operazioni" : "Personale · Fisco · Credito · Bilancio"}
        </button>
        <div className={styles.opsRight}>
          {!coachOn && (
            <button className={styles.linkish} onClick={enableCoach}>
              Mostra guide
            </button>
          )}
          <button className={styles.linkish} onClick={() => setScreen("menu")}>
            Menu
          </button>
        </div>
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
