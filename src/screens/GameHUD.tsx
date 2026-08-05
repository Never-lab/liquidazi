import { InvoicesPanel } from "../components/InvoicesPanel";
import { TaxPanel } from "../components/TaxPanel";
import { formatCash } from "../components/formatCash";
import { useGameStore } from "../store/gameStore";
import styles from "./GameHUD.module.css";

const MESI = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

export const GameHUD = () => {
  const company = useGameStore((s) => s.game.company);
  const calendar = useGameStore((s) => s.game.calendar);
  const doAdvanceMonth = useGameStore((s) => s.advanceMonth);

  return (
    <div className={styles.hud}>
      <section className={styles.card}>
        <h2 className={styles.cardLabel}>Azienda</h2>
        <p className={styles.cardValue}>{company.name}</p>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardLabel}>Cassa</h2>
        <p className={styles.cardValue}>{formatCash(company.cash)}</p>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardLabel}>Periodo</h2>
        <p className={styles.cardValue}>
          {MESI[calendar.month - 1]} {calendar.year}
        </p>
      </section>

      <button className={styles.advanceButton} onClick={doAdvanceMonth}>
        Avanza 1 mese
      </button>

      <InvoicesPanel />
      <TaxPanel />
    </div>
  );
};
