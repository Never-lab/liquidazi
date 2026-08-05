import { InvoicesPanel } from "../components/InvoicesPanel";
import { LoanPanel } from "../components/LoanPanel";
import { PayrollPanel } from "../components/PayrollPanel";
import { ReportPanel } from "../components/ReportPanel";
import { TaxPanel } from "../components/TaxPanel";
import { formatCash } from "../components/formatCash";
import { sectorById, zoneById } from "../config/market";
import { marketModifiers } from "../sim/market";
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
  const mods = marketModifiers(company.rivals);
  const zone = zoneById(company.zone);
  const sector = sectorById(company.sector);

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
          {zone.label} · {sector.label}
        </p>
        <p className={styles.cardHint}>
          {company.rivals} rivali ({mods.pressureLabel}) · affitto{" "}
          {formatCash(company.monthlyRent)}/mese
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
