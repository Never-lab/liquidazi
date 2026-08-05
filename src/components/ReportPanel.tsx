import { useGameStore } from "../store/gameStore";
import { formatCash } from "./formatCash";
import styles from "./panels.module.css";

export const ReportPanel = () => {
  const report = useGameStore((s) => s.game.lastYearReport);

  if (!report) return null;

  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Bilancio {report.year} (semplificato)</h2>
      <ul className={styles.list}>
        <li><span>Ricavi</span><span>{formatCash(report.revenue)}</span></li>
        <li><span>Acquisti</span><span>−{formatCash(report.purchases)}</span></li>
        <li><span>Costo del personale</span><span>−{formatCash(report.payrollCost)}</span></li>
        <li><span>Interessi passivi</span><span>−{formatCash(report.interest)}</span></li>
        <li><span>Altri costi</span><span>−{formatCash(report.otherCosts)}</span></li>
        <li><span><strong>Utile fiscale</strong></span><span><strong>{formatCash(report.profit)}</strong></span></li>
        <li><span>IRES</span><span>{formatCash(report.ires)}</span></li>
        <li><span>IRAP (base {formatCash(report.irapBase)})</span><span>{formatCash(report.irap)}</span></li>
      </ul>
      <p className={styles.muted}>
        Nota didattica: IRES e IRAP hanno basi diverse. Per l&apos;IRAP
        (semplificata) personale e interessi non sono deducibili: la base resta
        più alta dell&apos;utile. Saldo a giugno, acconti a giugno e novembre.
      </p>
    </section>
  );
};
