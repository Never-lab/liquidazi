import type { HistoryPoint } from "../sim/types";
import styles from "./Charts.module.css";

const W = 360;
const H_CASH = 150;
const H_PL = 110;
const PAD = 12;
const PAD_L = 8;
const PAD_B = 22;

const fmtEur = (n: number) =>
  n.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });

const seriesPoints = (
  values: number[],
  width: number,
  height: number,
  padX: number,
  padTop: number,
  padBottom: number,
  minForce?: number,
  maxForce?: number,
): { x: number; y: number }[] => {
  if (values.length === 0) return [];
  const min = minForce ?? Math.min(...values, 0);
  const max = maxForce ?? Math.max(...values, 1);
  const span = max - min || 1;
  const plotH = height - padTop - padBottom;
  return values.map((v, i) => ({
    x: padX + (i / Math.max(values.length - 1, 1)) * (width - padX * 2),
    y: padTop + plotH - ((v - min) / span) * plotH,
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
  const pts = seriesPoints(cash.slice(-12), w, h, 2, 2, 2);
  if (pts.length < 2) return null;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={styles.spark} aria-hidden>
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
  if (recent.length === 0) {
    return (
      <section className={styles.board}>
        <p className={styles.empty}>Chiudi qualche mese: qui compare l&apos;andamento di cassa e risultato.</p>
      </section>
    );
  }

  const cash = recent.map((h) => h.cash);
  const labels = recent.map((h) => h.label);
  const results = recent.map((h) => h.revenue - h.costs);

  const last = recent[recent.length - 1]!;
  const prev = recent.length > 1 ? recent[recent.length - 2]! : null;
  const cashDelta = prev ? last.cash - prev.cash : 0;
  const sumRev = recent.reduce((s, h) => s + h.revenue, 0);
  const sumCost = recent.reduce((s, h) => s + h.costs, 0);
  const sumResult = sumRev - sumCost;

  const cashMin = Math.min(...cash, 0);
  const cashMax = Math.max(...cash, 1);
  const cashPts = seriesPoints(cash, W, H_CASH, PAD, PAD, PAD_B, cashMin, cashMax);
  const plotH = H_CASH - PAD - PAD_B;
  const zeroY = PAD + plotH - ((0 - cashMin) / (cashMax - cashMin || 1)) * plotH;
  const lastPt = cashPts[cashPts.length - 1];

  const absMax = Math.max(...results.map((r) => Math.abs(r)), 1);
  const n = recent.length;
  const groupW = (W - PAD_L * 2) / n;
  const barW = Math.max(4, groupW * 0.55);
  const midY = PAD + (H_PL - PAD - PAD_B) / 2;
  const halfH = (H_PL - PAD - PAD_B) / 2;

  const labelStep = n > 8 ? 2 : 1;

  return (
    <section className={styles.board}>
      <header className={styles.boardHead}>
        <h2 className={styles.boardTitle}>Andamento</h2>
        <p className={styles.boardSub}>ultimi {recent.length} mesi chiusi</p>
      </header>

      <div className={styles.kpis}>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Cassa</span>
          <strong className={last.cash < 0 ? styles.kpiBad : styles.kpiVal}>{fmtEur(last.cash)}</strong>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Δ mese</span>
          <strong className={cashDelta < 0 ? styles.kpiBad : styles.kpiGood}>
            {cashDelta >= 0 ? "+" : ""}
            {fmtEur(cashDelta)}
          </strong>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Ris. periodo</span>
          <strong className={sumResult < 0 ? styles.kpiBad : styles.kpiGood}>
            {sumResult >= 0 ? "+" : ""}
            {fmtEur(sumResult)}
          </strong>
        </div>
      </div>

      <div className={styles.chart}>
        <h3 className={styles.title}>Cassa</h3>
        <svg
          viewBox={`0 0 ${W} ${H_CASH}`}
          className={styles.svgTall}
          role="img"
          aria-label="Grafico cassa nel tempo"
        >
          <line x1={PAD} x2={W - PAD} y1={zeroY} y2={zeroY} className={styles.zeroLine} />
          {cashPts.length > 0 && (
            <path d={areaPath(cashPts, zeroY)} className={styles.cashArea} />
          )}
          <polyline
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            points={poly(cashPts)}
          />
          {cashPts.map((p, i) => (
            <circle key={`c-${i}`} cx={p.x} cy={p.y} r="0" className={styles.hit}>
              <title>
                {labels[i]}: {fmtEur(cash[i]!)}
              </title>
            </circle>
          ))}
          {lastPt && <circle cx={lastPt.x} cy={lastPt.y} r="4" className={styles.cashDot} />}
          {cashPts.map((p, i) =>
            i % labelStep === 0 || i === cashPts.length - 1 ? (
              <text
                key={`lbl-${i}`}
                x={p.x}
                y={H_CASH - 6}
                className={styles.axisLabel}
                textAnchor="middle"
              >
                {labels[i]}
              </text>
            ) : null,
          )}
        </svg>
      </div>

      <div className={styles.chart}>
        <h3 className={styles.title}>Risultato mensile (ricavi − costi)</h3>
        <svg
          viewBox={`0 0 ${W} ${H_PL}`}
          className={styles.svg}
          role="img"
          aria-label="Grafico risultato mensile"
        >
          <line x1={PAD_L} x2={W - PAD_L} y1={midY} y2={midY} className={styles.zeroLine} />
          {recent.map((h, i) => {
            const result = results[i]!;
            const x = PAD_L + i * groupW + (groupW - barW) / 2;
            const hBar = (Math.abs(result) / absMax) * halfH;
            const y = result >= 0 ? midY - hBar : midY;
            return (
              <g key={`pl-${i}-${h.monthIdx}`}>
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={Math.max(1, hBar)}
                  className={result >= 0 ? styles.barProfit : styles.barLoss}
                >
                  <title>
                    {h.label}: ricavi {fmtEur(h.revenue)} − costi {fmtEur(h.costs)} ={" "}
                    {result >= 0 ? "+" : ""}
                    {fmtEur(result)}
                  </title>
                </rect>
              </g>
            );
          })}
          {recent.map((h, i) =>
            i % labelStep === 0 || i === recent.length - 1 ? (
              <text
                key={`plbl-${i}`}
                x={PAD_L + i * groupW + groupW / 2}
                y={H_PL - 6}
                className={styles.axisLabel}
                textAnchor="middle"
              >
                {h.label}
              </text>
            ) : null,
          )}
        </svg>
        <p className={styles.caption}>
          <span className={styles.legGood}>Utile mese</span>
          {" · "}
          <span className={styles.legBad}>Perdita mese</span>
          {" · "}
          ricavi periodo {fmtEur(sumRev)} · costi {fmtEur(sumCost)}
        </p>
      </div>
    </section>
  );
};
