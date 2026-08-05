import { useState } from "react";
import { canRequestLoan, fidoMaxFor } from "../sim/actions";
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
  const doRequestFido = useGameStore((s) => s.requestFido);
  const doDrawFido = useGameStore((s) => s.drawFido);
  const [principal, setPrincipal] = useState("10000");
  const [tenor, setTenor] = useState("12");
  const [rateType, setRateType] = useState<"fixed" | "floating">("fixed");
  const [guarantee, setGuarantee] = useState<LoanGuarantee>("none");
  const [fidoLimit, setFidoLimit] = useState("8000");
  const [fidoDraw, setFidoDraw] = useState("2000");

  const loan = game.loan;
  const active = loan !== null && loan.outstanding > 0;
  const approvable = canRequestLoan(game, Number(principal), guarantee);
  const fido = game.fido;
  const fidoCap = fidoMaxFor(game);

  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Credito</h2>

      {game.compliance < 70 && (
        <p className={styles.warning}>
          Compliance {Math.round(game.compliance)}/100: spread banca maggiorato
          {game.compliance < 40 ? " e tetto fido ridotto." : "."}
        </p>
      )}

      {active ? (
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
              Richiedi mutuo
            </button>
            {!approvable && Number(principal) > 0 && (
              <span className={styles.warning}>Importo oltre il tetto: serve una garanzia.</span>
            )}
          </div>
        </>
      )}

      <h3 className={styles.panelTitle} style={{ marginTop: 16 }}>Fido di cassa</h3>
      {fido ? (
        <>
          <ul className={styles.list}>
            <li><span>Accordato</span><span>{formatCash(fido.limit)}</span></li>
            <li><span>Utilizzato</span><span>{formatCash(fido.drawn)}</span></li>
            <li><span>Disponibile</span><span>{formatCash(fido.limit - fido.drawn)}</span></li>
          </ul>
          <div className={styles.row}>
            <input
              className={styles.input}
              type="number"
              min="0"
              value={fidoDraw}
              onChange={(e) => setFidoDraw(e.target.value)}
              aria-label="Importo prelievo fido"
            />
            <button
              className={styles.buttonSecondary}
              disabled={fido.drawn >= fido.limit}
              onClick={() => doDrawFido(Number(fidoDraw))}
            >
              Preleva
            </button>
          </div>
          <p className={styles.muted}>Interessi mensili sullo scoperto; rimborso automatico se torni in positivo.</p>
        </>
      ) : (
        <div className={styles.row}>
          <input
            className={styles.input}
            type="number"
            min="0"
            max={fidoCap}
            value={fidoLimit}
            onChange={(e) => setFidoLimit(e.target.value)}
            aria-label="Limite fido"
          />
          <button
            className={styles.buttonSecondary}
            disabled={!(Number(fidoLimit) > 0) || Number(fidoLimit) > fidoCap}
            onClick={() => doRequestFido(Number(fidoLimit))}
          >
            Apri fido (max {formatCash(fidoCap)})
          </button>
        </div>
      )}

      <p className={styles.muted}>
        Mutuo a piano rate e fido possono coesistere. Il Fondo PMI non è un contributo a fondo perduto.
      </p>
    </section>
  );
};
