import type { HistoryPoint } from "../sim/types";
import styles from "./Charts.module.css";

const W = 320;
const H = 120;
const PAD = 10;

const seriesPoints = (
  values: number[],
  width: number,
  height: number,
  pad = PAD,
  minForce?: number,
  maxForce?: number,
): { x: number; y: number }[] => {
  if (values.length === 0) return [];
  const min = minForce ?? Math.min(...values, 0);
  const max = maxForce ?? Math.max(...values, 1);
  const span = max - min || 1;
  return values.map((v, i) => ({
    x: pad + (i / Math.max(values.length - 1, 1)) * (width - pad * 2),
    y: height - pad - ((v - min) / span) * (height - pad * 2),
  }));
};

const poly = (pts: { x: number; y: number }[]) => pts.map((p) => `${p.x},${p.y}`).join(" ");

const areaPath = (pts: { x: number; y: number }[], baselineY: number): string => {
  if (pts.length === 0) return "";
  const head = `M ${pts[0]!.x} ${baselineY} L ${pts[0]!.x} ${pts[0]!.y}`;
  const mid = pts.slice(1).map((p) => `L ${p.x} ${p.y}`).join(" ");
  const last = pts[pts.length - 1]!;
  return `${head} ${mid} L ${last.x} ${baselineY} Z`;
};

export const CashSparkline = ({
  history,
  bad,
}: {
  history: HistoryPoint[];
  bad?: boolean;
}) => {
  const cash = history.map((h) => h.cash);
  const w = 80;
  const h = 28;
  const pts = seriesPoints(cash.slice(-12), w, h, 2);
  if (pts.length < 2) return null;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={styles.spark}
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={bad ? "var(--color-danger)" : "currentColor"}
        strokeWidth="1.8"
        strokeLinejoin="round"
        points={poly(pts)}
      />
    </svg>
  );
};

export const ChartsPanel = ({ history }: { history: HistoryPoint[] }) => {
  const recent = history.slice(-12);
  const cash = recent.map((h) => h.cash);
  const revenue = recent.map((h) => h.revenue);
  const costs = recent.map((h) => h.costs);
  const labels = recent.map((h) => h.label);

  const cashMin = Math.min(...cash, 0);
  const cashMax = Math.max(...cash, 1);
  const cashPts = seriesPoints(cash, W, H, PAD, cashMin, cashMax);
  const zeroY =
    H - PAD - ((0 - cashMin) / (cashMax - cashMin || 1)) * (H - PAD * 2);
  const last = cashPts[cashPts.length - 1];

  const barMax = Math.max(...revenue, ...costs, 1);
  const n = Math.max(revenue.length, 1);
  const groupW = (W - PAD * 2) / n;
  const barW = Math.max(3, groupW * 0.35);

  const lastCash = cash.length ? cash[cash.length - 1]! : 0;

  return (
    <section className={styles.wrap}>
      <div className={styles.chart}>
        <h2 className={styles.title}>Cassa nel tempo</h2>
        <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg} role="img" aria-label="Grafico cassa">
          <line
            x1={PAD}
            x2={W - PAD}
            y1={zeroY}
            y2={zeroY}
            className={styles.zeroLine}
          />
          {cashPts.length > 0 && (
            <path
              d={areaPath(cashPts, zeroY)}
              className={styles.cashArea}
            />
          )}
          <polyline
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            points={poly(cashPts)}
          />
          {cashPts.map((p, i) => (
            <circle key={`cash-pt-${i}`} cx={p.x} cy={p.y} r="0" className={styles.hit}>
              <title>
                {labels[i]}:{" "}
                {cash[i]!.toLocaleString("it-IT", {
                  style: "currency",
                  currency: "EUR",
                  maximumFractionDigits: 0,
                })}
              </title>
            </circle>
          ))}
          {last && (
            <circle cx={last.x} cy={last.y} r="4" className={styles.cashDot} />
          )}
        </svg>
        <p className={styles.caption}>
          Ultimo:{" "}
          {cash.length
            ? lastCash.toLocaleString("it-IT", {
                style: "currency",
                currency: "EUR",
                maximumFractionDigits: 0,
              })
            : "—"}
        </p>
      </div>

      <div className={styles.chart}>
        <h2 className={styles.title}>Ricavi vs costi (mesi)</h2>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className={styles.svg}
          role="img"
          aria-label="Grafico ricavi costi a barre"
        >
          {recent.map((h, i) => {
            const x0 = PAD + i * groupW + groupW * 0.12;
            const revH = (h.revenue / barMax) * (H - PAD * 2);
            const costH = (h.costs / barMax) * (H - PAD * 2);
            return (
              <g key={`bars-${i}-${h.monthIdx}`}>
                <rect
                  x={x0}
                  y={H - PAD - revH}
                  width={barW}
                  height={Math.max(0, revH)}
                  className={styles.barRev}
                >
                  <title>
                    {h.label} ricavi{" "}
                    {h.revenue.toLocaleString("it-IT", {
                      style: "currency",
                      currency: "EUR",
                      maximumFractionDigits: 0,
                    })}
                  </title>
                </rect>
                <rect
                  x={x0 + barW + 2}
                  y={H - PAD - costH}
                  width={barW}
                  height={Math.max(0, costH)}
                  className={styles.barCost}
                >
                  <title>
                    {h.label} costi{" "}
                    {h.costs.toLocaleString("it-IT", {
                      style: "currency",
                      currency: "EUR",
                      maximumFractionDigits: 0,
                    })}
                  </title>
                </rect>
              </g>
            );
          })}
        </svg>
        <p className={styles.caption}>
          <span className={styles.legGood}>Ricavi</span>
          {" · "}
          <span className={styles.legBad}>Costi</span>
          {" · ultimi "}
          {recent.length} mesi
        </p>
      </div>
    </section>
  );
};
