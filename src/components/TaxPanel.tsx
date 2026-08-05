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
  const liabilities = useGameStore((s) => s.game.liabilities);
  const vatCredit = useGameStore((s) => s.game.vat.credit);

  const openLiabilities = liabilities.filter((l) => !l.paid);

  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Debiti fiscali</h2>

      {vatCredit > 0 && (
        <p className={styles.muted}>Credito IVA a riporto: {formatCash(vatCredit)}</p>
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
    </section>
  );
};
