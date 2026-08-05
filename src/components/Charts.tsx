import type { HistoryPoint } from "../sim/types";
import styles from "./Charts.module.css";

const poly = (pts: { x: number; y: number }[]) =>
  pts.map((p) => `${p.x},${p.y}`).join(" ");

const seriesPath = (
  values: number[],
  width: number,
  height: number,
  pad = 8,
): string => {
  if (values.length === 0) return "";
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const span = max - min || 1;
  const pts = values.map((v, i) => ({
    x: pad + (i / Math.max(values.length - 1, 1)) * (width - pad * 2),
    y: height - pad - ((v - min) / span) * (height - pad * 2),
  }));
  return poly(pts);
};

export const ChartsPanel = ({ history }: { history: HistoryPoint[] }) => {
  const cash = history.map((h) => h.cash);
  const revenue = history.map((h) => h.revenue);
  const costs = history.map((h) => h.costs);
  const w = 320;
  const h = 120;

  return (
    <section className={styles.wrap}>
      <div className={styles.chart}>
        <h2 className={styles.title}>Cassa nel tempo</h2>
        <svg viewBox={`0 0 ${w} ${h}`} className={styles.svg} role="img" aria-label="Grafico cassa">
          <polyline
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="2.5"
            points={seriesPath(cash, w, h)}
          />
        </svg>
        <p className={styles.caption}>
          Ultimo: {cash.length ? cash[cash.length - 1]!.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }) : "—"}
        </p>
      </div>
      <div className={styles.chart}>
        <h2 className={styles.title}>Ricavi vs costi (mese)</h2>
        <svg viewBox={`0 0 ${w} ${h}`} className={styles.svg} role="img" aria-label="Grafico ricavi costi">
          <polyline
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="2.5"
            points={seriesPath(revenue, w, h)}
          />
          <polyline
            fill="none"
            stroke="var(--color-danger)"
            strokeWidth="2.5"
            strokeDasharray="4 3"
            points={seriesPath(costs, w, h)}
          />
        </svg>
        <p className={styles.caption}>
          <span className={styles.legGood}>Ricavi</span>
          {" · "}
          <span className={styles.legBad}>Costi</span>
        </p>
      </div>
    </section>
  );
};
