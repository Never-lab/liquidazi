import { useState } from "react";
import {
  BOARD_FILTER_LABEL,
  nextBoardFilter,
  visibleOpportunities,
  type BoardFilter,
} from "../sim/boardView";
import {
  emergencySupplyNet,
  maxDealNet,
  monthlyCapacity,
  salesAcceptedThisMonth,
  supplyMonthsFromNet,
} from "../sim/events";
import { repDefaultMult, repSlotBonus } from "../sim/reputation";
import { formatCash } from "./formatCash";
import { useGameStore } from "../store/gameStore";
import { Icon } from "../ui/icons";
import styles from "./panels.module.css";

export const OpportunitiesPanel = () => {
  const game = useGameStore((s) => s.game);
  const accept = useGameStore((s) => s.acceptOpportunity);
  const decline = useGameStore((s) => s.declineOpportunity);
  const emergency = useGameStore((s) => s.orderEmergencySupply);
  const [filter, setFilter] = useState<BoardFilter>("in");
  const cap = maxDealNet(game);
  const capacity = monthlyCapacity(game);
  const taken = salesAcceptedThisMonth(game);
  const stockMonths = game.supplyMonths ?? 0;
  const emptyStock = stockMonths <= 0;
  const boardHasSupply = game.opportunities.some((o) => o.kind === "supply");
  const visible = visibleOpportunities(game.opportunities, filter);
  const hidden = game.opportunities.length - visible.length;
  const rep = Math.round(game.company.reputation);
  const repSlots = repSlotBonus(game.company.reputation);
  const insolutiMult = repDefaultMult(game.company.reputation);
  const emergencyCost = emergencySupplyNet(game);

  return (
    <section className={styles.panelWide}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>Commesse del mese</h2>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={() => setFilter((f) => nextBoardFilter(f))}
          title={`Filtro: ${BOARD_FILTER_LABEL[filter]}. Tocca per cambiare.`}
          aria-label={`Filtro commesse: ${BOARD_FILTER_LABEL[filter]}`}
        >
          <Icon name="filter" size={16} />
          {BOARD_FILTER_LABEL[filter]}
        </button>
      </div>
      <div className={styles.statChips} aria-label="Indicatori commesse">
        <span
          className={styles.statChip}
          title="Massimo netto accettabile su una singola vendita questo mese"
        >
          Tetto max {formatCash(cap)}
        </span>
        <span
          className={styles.statChip}
          title="Vendite accettate / slot disponibili questo mese"
        >
          Capacità {taken}/{capacity}
        </span>
        <span
          className={styles.statChip}
          title={
            emptyStock
              ? "Scorte a zero: ticket −28% e più insoluti. Ordina forniture o emergenza (10% cassa, min 1.500 €)."
              : `Scorte ${stockMonths} mesi: contratti +8% netto · meno insoluti. Forniture board: ≥1.200 € → +2 mesi, altrimenti +1.`
          }
        >
          Scorte {stockMonths} {stockMonths === 1 ? "mese" : "mesi"}
        </span>
        <span
          className={styles.statChip}
          title={`Rep ${rep} → +${repSlots} slot · insoluti ×${insolutiMult.toFixed(2)} · più rep = più offerte e meno insoluti`}
        >
          Reputazione {rep}
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
      <p className={styles.muted}>
        {emptyStock
          ? "Scorte a zero: ticket −28% e più insoluti. C'è sempre almeno una fornitura sul tabellone; in alternativa usa l'ordine d'emergenza (cara se hai tanta cassa)."
          : "Forniture = scorte (mesi). Con scorte i contratti pagano +8%. PA paga tardi; i privati a volte non pagano."}
      </p>
      {emptyStock && (
        <p className={styles.row}>
          <button type="button" className={styles.buttonSecondary} onClick={emergency}>
            Ordina fornitura d&apos;emergenza ({formatCash(emergencyCost)} + IVA → +2 mesi)
          </button>
          {!boardHasSupply && (
            <span className={styles.warning}>Nessuna fornitura in lista — usa l&apos;emergenza.</span>
          )}
        </p>
      )}
      {game.opportunities.length === 0 ? (
        <p className={styles.muted}>Nessuna offerta aperta — avanza il mese.</p>
      ) : visible.length === 0 ? (
        <p className={styles.muted}>
          Nessuna commessa in questa vista — tocca il filtro per vedere le altre.
        </p>
      ) : (
        <>
          {hidden > 0 && (
            <p className={styles.muted}>
              {hidden} {hidden === 1 ? "offerta nascosta" : "offerte nascoste"} — tocca il filtro.
            </p>
          )}
          <div className={styles.cards}>
            {visible.map((op) => (
              <article key={op.id} className={styles.deal}>
                <div>
                  <h3 className={styles.dealTitle}>{op.title}</h3>
                  <p className={styles.dealMeta}>
                    {op.kind === "sale" ? "Entrata" : "Uscita"} · {formatCash(op.net)} + IVA
                    {op.kind === "supply"
                      ? ` · +${supplyMonthsFromNet(op.net)} mesi scorte`
                      : ""}
                    {op.kind === "sale" && op.clientType === "pa" ? " · PA" : ""}
                    {op.contractMonths
                      ? ` · Contratto ${op.contractMonths} mesi (−1 slot)`
                      : op.kind === "sale" && op.termMonths > 1
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
        </>
      )}
    </section>
  );
};
