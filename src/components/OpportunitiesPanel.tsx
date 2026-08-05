import { maxDealNet, monthlyCapacity, salesAcceptedThisMonth } from "../sim/events";
import { formatCash } from "./formatCash";
import { useGameStore } from "../store/gameStore";
import styles from "./panels.module.css";

export const OpportunitiesPanel = () => {
  const game = useGameStore((s) => s.game);
  const accept = useGameStore((s) => s.acceptOpportunity);
  const decline = useGameStore((s) => s.declineOpportunity);
  const cap = maxDealNet(game);
  const capacity = monthlyCapacity(game);
  const taken = salesAcceptedThisMonth(game);

  return (
    <section className={styles.panelWide}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>Commesse del mese</h2>
        <span className={styles.badge}>
          tetto {formatCash(cap)} · {taken}/{capacity} slot · scorte{" "}
          {game.supplyMonths ?? 0}m · rep {Math.round(game.company.reputation)}
          {(game.activeContracts?.length ?? 0) > 0
            ? ` · contratti ${game.activeContracts!.length}`
            : ""}
        </span>
      </div>
      <p className={styles.muted}>
        {(game.supplyMonths ?? 0) <= 0
          ? "Scorte a zero: ticket −28% e più insoluti. Ordina una fornitura."
          : "Forniture = scorte (mesi). Contratti bloccano 1 slot per 3 mesi. PA paga tardi; i privati a volte non pagano."}
      </p>
      {game.opportunities.length === 0 ? (
        <p className={styles.muted}>Nessuna offerta aperta — avanza il mese.</p>
      ) : (
        <div className={styles.cards}>
          {game.opportunities.map((op) => (
            <article key={op.id} className={styles.deal}>
              <div>
                <h3 className={styles.dealTitle}>{op.title}</h3>
                <p className={styles.dealMeta}>
                  {op.kind === "sale" ? "Entrata" : "Uscita"} · {formatCash(op.net)} + IVA
                  {op.kind === "sale" && op.clientType === "pa" ? " · PA" : ""}
                  {op.contractMonths
                    ? ` · Contratto ${op.contractMonths} mesi (−1 slot)`
                    : op.termMonths > 1
                      ? ` · ${op.termMonths} mesi`
                      : ""}
                </p>
              </div>
              <div className={styles.dealActions}>
                <button className={styles.button} onClick={() => accept(op.id)}>
                  Accetta
                </button>
                <button className={styles.buttonSecondary} onClick={() => decline(op.id)}>
                  Lascia
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
