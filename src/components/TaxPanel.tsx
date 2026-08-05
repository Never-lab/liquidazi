import { dueF24Total } from "../sim/selectors";
import { useGameStore } from "../store/gameStore";
import { formatCash } from "./formatCash";
import styles from "./panels.module.css";

const KIND_LABEL: Record<string, string> = {
  IVA: "IVA",
  IRPEF: "Ritenute IRPEF",
  INPS: "Contributi INPS",
  IRES: "IRES",
  IRAP: "IRAP",
};

export const TaxPanel = () => {
  const game = useGameStore((s) => s.game);
  const doPayF24 = useGameStore((s) => s.payF24);

  const openLiabilities = game.liabilities.filter((l) => !l.paid);
  const dueNow = dueF24Total(game);

  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Debiti fiscali</h2>

      {game.vat.credit > 0 && (
        <p className={styles.muted}>
          Credito IVA a riporto: {formatCash(game.vat.credit)}
        </p>
      )}

      {openLiabilities.length === 0 ? (
        <p className={styles.muted}>Nessun debito fiscale aperto.</p>
      ) : (
        <ul className={styles.list}>
          {openLiabilities.map((l) => (
            <li key={l.id}>
              <span>
                {KIND_LABEL[l.kind] ?? l.kind}
                {l.penalized && <span className={styles.danger}> (sanzionato)</span>}
              </span>
              <span>{formatCash(l.amount)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.row}>
        <button className={styles.button} disabled={dueNow <= 0} onClick={doPayF24}>
          Paga F24 ({formatCash(dueNow)})
        </button>
      </div>
      <p className={styles.muted}>
        Scadenza F24: giorno 16 del mese successivo alla competenza. Saltarla
        costa sanzioni, interessi e reputazione.
      </p>
      <p className={styles.muted}>Compliance: {game.compliance}/100</p>
    </section>
  );
};
