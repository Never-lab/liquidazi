import { useState } from "react";
import { canRequestLoan } from "../sim/actions";
import type { LoanGuarantee } from "../sim/types";
import { useGameStore } from "../store/gameStore";
import { formatCash } from "./formatCash";
import styles from "./panels.module.css";

const GUARANTEE_LABEL: Record<LoanGuarantee, string> = {
  none: "Nessuna garanzia",
  fondo_garanzia_pmi: "Fondo di Garanzia PMI",
  fideiussione: "Fideiussione personale",
};

export const LoanPanel = () => {
  const game = useGameStore((s) => s.game);
  const doRequestLoan = useGameStore((s) => s.requestLoan);
  const [principal, setPrincipal] = useState("10000");
  const [tenor, setTenor] = useState("12");
  const [rateType, setRateType] = useState<"fixed" | "floating">("fixed");
  const [guarantee, setGuarantee] = useState<LoanGuarantee>("none");

  const loan = game.loan;
  const active = loan !== null && loan.outstanding > 0;
  const approvable = canRequestLoan(game, Number(principal), guarantee);

  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Credito</h2>

      {active ? (
        <>
          <ul className={styles.list}>
            <li><span>Debito residuo</span><span>{formatCash(loan.outstanding)}</span></li>
            <li>
              <span>Tasso</span>
              <span>{loan.rateType === "fixed" ? "Fisso" : "Variabile (Euribor 3M + spread)"}</span>
            </li>
            <li><span>Garanzia</span><span>{GUARANTEE_LABEL[loan.guarantee]}</span></li>
            {loan.lastInstallment && (
              <li>
                <span>Ultima rata</span>
                <span>
                  {formatCash(loan.lastInstallment.principal + loan.lastInstallment.interest)}{" "}
                  (int. {formatCash(loan.lastInstallment.interest)})
                </span>
              </li>
            )}
          </ul>
        </>
      ) : (
        <>
          <div className={styles.row}>
            <input
              className={styles.input}
              type="number"
              min="0"
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
              aria-label="Importo prestito"
            />
            <select
              className={styles.input}
              value={tenor}
              onChange={(e) => setTenor(e.target.value)}
            >
              <option value="12">12 mesi</option>
              <option value="24">24 mesi</option>
              <option value="36">36 mesi</option>
            </select>
          </div>
          <div className={styles.row}>
            <select
              className={styles.input}
              value={rateType}
              onChange={(e) => setRateType(e.target.value as "fixed" | "floating")}
            >
              <option value="fixed">Tasso fisso</option>
              <option value="floating">Tasso variabile</option>
            </select>
            <select
              className={styles.input}
              value={guarantee}
              onChange={(e) => setGuarantee(e.target.value as LoanGuarantee)}
            >
              {Object.entries(GUARANTEE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className={styles.row}>
            <button
              className={styles.button}
              disabled={!approvable}
              onClick={() =>
                doRequestLoan({
                  principal: Number(principal),
                  tenorMonths: Number(tenor),
                  rateType,
                  guarantee,
                })
              }
            >
              Richiedi prestito
            </button>
            {!approvable && Number(principal) > 0 && (
              <span className={styles.warning}>Importo oltre il tetto: serve una garanzia.</span>
            )}
          </div>
          <p className={styles.muted}>
            Il Fondo di Garanzia PMI garantisce la banca: più credito e spread
            più basso. Non è un contributo a fondo perduto — il debito resta tuo.
          </p>
        </>
      )}
    </section>
  );
};
