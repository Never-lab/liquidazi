import { useState } from "react";
import { useGameStore } from "../store/gameStore";
import { formatCash } from "./formatCash";
import styles from "./panels.module.css";

const delta = (cur: number, prev: number): string => {
  const d = cur - prev;
  const sign = d > 0 ? "+" : "";
  return `${sign}${formatCash(d)}`;
};

export const ReportPanel = () => {
  const game = useGameStore((s) => s.game);
  const reports =
    game.yearReports?.length
      ? game.yearReports
      : game.lastYearReport
        ? [game.lastYearReport]
        : [];
  const [year, setYear] = useState<number | null>(null);

  if (reports.length === 0) return null;

  const selected =
    reports.find((r) => r.year === year) ?? reports[reports.length - 1]!;
  const prev = reports[reports.indexOf(selected) - 1];

  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Bilancio (semplificato)</h2>
      {reports.length > 1 && (
        <div className={styles.row}>
          {reports.map((r) => (
            <button
              key={r.year}
              type="button"
              className={
                r.year === selected.year ? styles.button : styles.buttonSecondary
              }
              title={`Mostra il bilancio semplificato dell'anno ${r.year}.`}
              onClick={() => setYear(r.year)}
            >
              {r.year}
            </button>
          ))}
        </div>
      )}
      <h3 className={styles.panelTitle} style={{ marginTop: 8 }}>
        Anno {selected.year}
      </h3>
      <ul className={styles.list}>
        <li><span>Ricavi</span><span>{formatCash(selected.revenue)}</span></li>
        <li><span>Acquisti</span><span>−{formatCash(selected.purchases)}</span></li>
        <li><span>Costo del personale</span><span>−{formatCash(selected.payrollCost)}</span></li>
        <li><span>Oneri annuali personale</span><span>−{formatCash(selected.staffAnnualOneri ?? 0)}</span></li>
        <li><span>Interessi passivi</span><span>−{formatCash(selected.interest)}</span></li>
        <li><span>Altri costi</span><span>−{formatCash(selected.otherCosts - (selected.staffAnnualOneri ?? 0))}</span></li>
        <li><span>Plusvalenze partecipate</span><span>{formatCash(selected.capitalGains ?? 0)}</span></li>
        <li>
          <span><strong>Utile fiscale</strong></span>
          <span><strong>{formatCash(selected.profit)}</strong></span>
        </li>
        <li><span>IRES</span><span>{formatCash(selected.ires)}</span></li>
        <li>
          <span>IRAP (base {formatCash(selected.irapBase)})</span>
          <span>{formatCash(selected.irap)}</span>
        </li>
      </ul>
      {prev && (
        <>
          <h3 className={styles.panelTitle} style={{ marginTop: 12 }}>
            Δ vs {prev.year}
          </h3>
          <ul className={styles.list}>
            <li><span>Ricavi</span><span>{delta(selected.revenue, prev.revenue)}</span></li>
            <li><span>Utile</span><span>{delta(selected.profit, prev.profit)}</span></li>
            <li><span>IRES</span><span>{delta(selected.ires, prev.ires)}</span></li>
            <li><span>IRAP</span><span>{delta(selected.irap, prev.irap)}</span></li>
          </ul>
        </>
      )}
      <p className={styles.muted}>
        Nota didattica: IRES e IRAP hanno basi diverse. Per l&apos;IRAP
        (semplificata) personale e interessi non sono deducibili: la base resta
        più alta dell&apos;utile. Saldo a giugno, acconti a giugno e novembre.
      </p>
    </section>
  );
};
