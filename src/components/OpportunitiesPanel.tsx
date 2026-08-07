import {
  EMERGENCY_SUPPLY_NET,
  maxDealNet,
  monthlyCapacity,
  salesAcceptedThisMonth,
} from "../sim/events";
import { formatCash } from "./formatCash";
import { useGameStore } from "../store/gameStore";
import styles from "./panels.module.css";

export const OpportunitiesPanel = () => {
  const game = useGameStore((s) => s.game);
  const accept = useGameStore((s) => s.acceptOpportunity);
  const decline = useGameStore((s) => s.declineOpportunity);
  const emergency = useGameStore((s) => s.orderEmergencySupply);
  const cap = maxDealNet(game);
  const capacity = monthlyCapacity(game);
  const taken = salesAcceptedThisMonth(game);
  const emptyStock = (game.supplyMonths ?? 0) <= 0;
  const boardHasSupply = game.opportunities.some((o) => o.kind === "supply");

  return (
    <section className={styles.panelWide}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>Commesse del mese</h2>
        <div className={styles.statChips} aria-label="Indicatori commesse">
          <span
            className={styles.statChip}
            title="Massimo netto accettabile su una singola vendita questo mese"
          >
            Tetto max {formatCash(cap)}
          </span>
          <span
            className={styles.statChip}
            title="Commesse vendita ancora accettabili questo mese (slot)"
          >
            Capacità {taken}/{capacity}
          </span>
          <span
            className={styles.statChip}
            title="Mesi di magazzino; a zero ticket più bassi e più insoluti"
          >
            Scorte {game.supplyMonths ?? 0} mesi
          </span>
          <span
            className={styles.statChip}
            title="Quanto ti cercano i clienti (0–100)"
          >
            Reputazione {Math.round(game.company.reputation)}
          </span>
          {(game.activeContracts?.length ?? 0) > 0 ? (
            <span
              className={styles.statChip}
              title="Contratti multi-mese attivi: ognuno blocca 1 slot"
            >
              Contratti {game.activeContracts!.length}
            </span>
          ) : null}
        </div>
      </div>
      <p className={styles.muted}>
        {emptyStock
          ? "Scorte a zero: ticket −28% e più insoluti. C'è sempre almeno una fornitura sul tabellone; in alternativa usa l'ordine d'emergenza."
          : "Forniture = scorte (mesi). Contratti bloccano 1 slot per 3 mesi. PA paga tardi; i privati a volte non pagano."}
      </p>
      {emptyStock && (
        <p className={styles.row}>
          <button type="button" className={styles.buttonSecondary} onClick={emergency}>
            Ordina fornitura d&apos;emergenza ({formatCash(EMERGENCY_SUPPLY_NET)} + IVA → +2 mesi)
          </button>
          {!boardHasSupply && (
            <span className={styles.warning}>Nessuna fornitura in lista — usa l&apos;emergenza.</span>
          )}
        </p>
      )}
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
