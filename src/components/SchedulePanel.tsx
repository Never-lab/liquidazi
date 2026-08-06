import {
  openInvoiceSchedule,
  scheduleTotals,
  thisCloseRows,
} from "../sim/selectors";
import { formatCash } from "./formatCash";
import { useGameStore } from "../store/gameStore";
import styles from "./panels.module.css";

type Props = {
  /** Compact strip on the desk; full panel in ops */
  compact?: boolean;
};

export const SchedulePanel = ({ compact }: Props) => {
  const game = useGameStore((s) => s.game);
  const rows = openInvoiceSchedule(game);
  const closing = thisCloseRows(rows);
  const later = rows.filter((r) => r.closesUntil > 0);
  const closeTot = scheduleTotals(closing);
  const openTot = scheduleTotals(rows);

  if (rows.length === 0) {
    if (compact) return null;
    return (
      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Scadenziario</h2>
        <p className={styles.muted}>
          Nessuna fattura aperta. Gli incassi/pagamenti si muovono quando chiudi il mese in cui
          scadono.
        </p>
      </section>
    );
  }

  return (
    <section className={compact ? styles.panelWide : styles.panel}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>Scadenziario fatture</h2>
        <span className={styles.badge}>
          aperte {openTot.count} · stock {formatCash(openTot.inflow)} in /{" "}
          {formatCash(Math.abs(openTot.outflow))} out
        </span>
      </div>

      <div className={styles.closePreview}>
        <p className={styles.closePreviewTitle}>
          Questa chiusura · {closeTot.count} fattur
          {closeTot.count === 1 ? "a" : "e"}
        </p>
        {closeTot.count === 0 ? (
          <p className={styles.muted}>
            Nessuna scadenza questo mese. Chiudendo non muovi cash da fatture (solo costi fissi /
            F24 se li paghi).
          </p>
        ) : (
          <p className={styles.closePreviewNums}>
            Incassi {formatCash(closeTot.inflow)}
            {" · "}
            Pagamenti {formatCash(Math.abs(closeTot.outflow))}
            {" · "}
            <strong>
              netto fatture {closeTot.net >= 0 ? "+" : ""}
              {formatCash(closeTot.net)}
            </strong>
          </p>
        )}
        <p className={styles.muted}>
          Solo queste {closeTot.count} su {openTot.count} aperte. Il resto resta in elenco. Privati:
          possibile insoluto.
        </p>
      </div>

      {closing.length > 0 && (
        <>
          <p className={styles.scheduleSection}>In scadenza ora</p>
          <ul className={styles.list}>
            {closing.map((r) => (
              <ScheduleRowItem key={r.invoice.id} r={r} now />
            ))}
          </ul>
        </>
      )}

      {later.length > 0 && (
        <>
          <p className={styles.scheduleSection}>
            Più avanti ({later.length} · {formatCash(scheduleTotals(later).inflow)} da
            incassare)
          </p>
          <ul className={styles.list}>
            {(compact ? later.slice(0, 6) : later).map((r) => (
              <ScheduleRowItem key={r.invoice.id} r={r} />
            ))}
          </ul>
          {compact && later.length > 6 && (
            <p className={styles.muted}>…altre {later.length - 6} in Operazioni → Fisco.</p>
          )}
        </>
      )}
    </section>
  );
};

const ScheduleRowItem = ({
  r,
  now,
}: {
  r: ReturnType<typeof openInvoiceSchedule>[number];
  now?: boolean;
}) => {
  const inv = r.invoice;
  const kind = inv.kind === "AR" ? "Cliente" : "Fornitore";
  const who =
    inv.kind === "AR" ? (inv.clientType === "pa" ? "PA" : "privato") : "acquisto";
  const when = now
    ? `Alla chiusura di questo mese (${r.dueLabel})`
    : `Alla chiusura di ${r.dueLabel}`;
  return (
    <li>
      <span>
        <strong>
          {kind} · {who}
        </strong>
        {" · "}
        #{inv.id}
        <br />
        <span className={styles.muted}>{when}</span>
      </span>
      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
        {r.cashDelta >= 0 ? "+" : ""}
        {formatCash(r.cashDelta)}
      </span>
    </li>
  );
};
