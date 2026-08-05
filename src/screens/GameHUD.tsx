import { InvoicesPanel } from "../components/InvoicesPanel";
import { LoanPanel } from "../components/LoanPanel";
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
  const company = useGameStore((s) => s.game.company);
  const calendar = useGameStore((s) => s.game.calendar);
  const doAdvanceMonth = useGameStore((s) => s.advanceMonth);
  const city = cityById(company.city);
  const mods = marketModifiersFromIndex(company.densityIndex);

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

      <section className={styles.card}>
        <h2 className={styles.cardLabel}>Mercato</h2>
        <p className={styles.cardValue}>
          {city.label} ({city.provinceCode})
        </p>
        <p className={styles.cardHint}>
          {city.regionLabel} · {company.firmsInSector.toLocaleString("it-IT")} imprese in provincia
          · {mods.pressureLabel} · affitto {formatCash(company.monthlyRent)}/mese
        </p>
      </section>

      <button className={styles.advanceButton} onClick={doAdvanceMonth}>
        Avanza 1 mese
      </button>

      <InvoicesPanel />
      <PayrollPanel />
      <TaxPanel />
      <LoanPanel />
      <ReportPanel />
    </div>
  );
};
