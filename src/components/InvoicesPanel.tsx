import { useState } from "react";
import { useGameStore } from "../store/gameStore";
import { formatCash } from "./formatCash";
import styles from "./panels.module.css";

export const InvoicesPanel = () => {
  const invoices = useGameStore((s) => s.game.invoices);
  const issue = useGameStore((s) => s.issueCustomerInvoice);
  const record = useGameStore((s) => s.recordSupplierCost);
  const [saleNet, setSaleNet] = useState("1000");
  const [costNet, setCostNet] = useState("400");

  const open = invoices.filter((i) => !i.settled);

  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Fatture</h2>

      <div className={styles.row}>
        <input
          className={styles.input}
          type="number"
          min="0"
          value={saleNet}
          onChange={(e) => setSaleNet(e.target.value)}
          aria-label="Imponibile vendita"
        />
        <button
          className={styles.button}
          disabled={!(Number(saleNet) > 0)}
          onClick={() => issue(Number(saleNet))}
        >
          Emetti fattura cliente
        </button>
      </div>

      <div className={styles.row}>
        <input
          className={styles.input}
          type="number"
          min="0"
          value={costNet}
          onChange={(e) => setCostNet(e.target.value)}
          aria-label="Imponibile costo"
        />
        <button
          className={styles.buttonSecondary}
          disabled={!(Number(costNet) > 0)}
          onClick={() => record(Number(costNet))}
        >
          Registra costo fornitore
        </button>
      </div>

      <p className={styles.muted}>
        Importi al netto IVA. Incasso/pagamento del lordo il mese successivo.
      </p>

      {open.length > 0 && (
        <ul className={styles.list}>
          {open.map((inv) => (
            <li key={inv.id}>
              <span>{inv.kind === "AR" ? "Cliente" : "Fornitore"} #{inv.id}</span>
              <span>{inv.kind === "AR" ? "+" : "−"}{formatCash(inv.gross)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
