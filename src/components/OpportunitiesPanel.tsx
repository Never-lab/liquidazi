import { useState } from "react";
import {
  BOARD_FILTER_LABEL,
  MARKET_FILTER_LABEL,
  nextBoardFilter,
  nextMarketFilter,
  visibleOpportunities,
  type BoardFilter,
  type MarketFilter,
} from "../sim/boardView";
import {
  emergencySupplyNet,
  maxDealNet,
  salesAcceptedThisMonth,
  supplyMonthsFromNet,
} from "../sim/events";
import { pendingMonths, warehouseMonths } from "../sim/supplies";
import {
  availableWorkforce,
  workforceRemaining,
  workforceUsedThisMonth,
} from "../sim/workforce";
import { repDefaultMult } from "../sim/reputation";
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
  const [market, setMarket] = useState<MarketFilter>("all");
  const cap = maxDealNet(game);
  const flAvail = availableWorkforce(game);
  const flUsed = workforceUsedThisMonth(game);
  const flLeft = workforceRemaining(game);
  const stockMonths = warehouseMonths(game);
  const arrivingMonths = pendingMonths(game);
  const emptyStock = stockMonths <= 0 && arrivingMonths <= 0;
  const boardHasSupply = game.opportunities.some((o) => o.kind === "supply");
  const visible = visibleOpportunities(game.opportunities, filter, market);
  const hidden = game.opportunities.length - visible.length;
  const loc = Math.round(game.company.reputation);
  const mun = Math.round(game.company.repMunicipal ?? 0);
  const nat = Math.round(game.company.repNational ?? 0);
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
        <button
          type="button"
          className={styles.iconBtn}
          onClick={() => setMarket((f) => nextMarketFilter(f))}
          title={`Mercato: ${MARKET_FILTER_LABEL[market]}. Tocca per cambiare.`}
          aria-label={`Filtro mercato: ${MARKET_FILTER_LABEL[market]}`}
        >
          {MARKET_FILTER_LABEL[market]}
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
          title="Forza lavoro usata / disponibile nel mese (base 30 senza dipendenti)"
        >
          FL {flUsed}/{flAvail} ({flLeft} libere)
        </span>
        <span
          className={styles.statChip}
          title="Commesse vendita accettate questo mese"
        >
          Commesse {salesAcceptedThisMonth(game)}
        </span>
        <span
          className={styles.statChip}
          title={
            emptyStock
              ? "Scorte a zero: ticket −28% e più insoluti. Ordina forniture (arrivo mese prossimo) o emergenza."
              : `Magazzino ${stockMonths} mesi${arrivingMonths > 0 ? ` · ${arrivingMonths} in arrivo` : ""}. Qualità scorte modifica l'introito commesse.`
          }
        >
          Scorte {stockMonths}m{arrivingMonths > 0 ? ` +${arrivingMonths} arr.` : ""}
        </span>
        <span
          className={styles.statChip}
          title={`Locale ${loc} → bonus FL · insoluti ×${insolutiMult.toFixed(2)}. Comunale ${mun} / nazionale ${nat}: più punti → più appalti di quel tipo.`}
        >
          Loc {loc} · Com {mun} · Naz {nat}
        </span>
        {(game.activeContracts?.length ?? 0) > 0 ? (
          <span
            className={styles.statChip}
            title="Contratti multi-mese attivi: bloccano FL finché aperti"
          >
            Contratti {game.activeContracts!.length}
          </span>
        ) : null}
      </div>
      <p className={styles.muted}>
        {emptyStock
          ? "Scorte a zero: ticket −28% e più insoluti. Le forniture arrivano il mese successivo all'ordine."
          : "Forniture per qualità (bassa −10% … ottima +5%). Con scorte in magazzino l'introito commesse cambia."}
      </p>
      {emptyStock && (
        <p className={styles.row}>
          <button type="button" className={styles.buttonSecondary} onClick={emergency}>
            Ordina fornitura d&apos;emergenza ({formatCash(emergencyCost)} + IVA → +2 mesi, arrivo prossimo mese)
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
                      ? ` · +${supplyMonthsFromNet(op.net)} mesi · arrivo mese prossimo`
                      : op.qualityRequired
                        ? ` · richiede scorte ≥${op.qualityRequired}`
                        : ""}
                    {op.kind === "sale" && op.clientType === "pa" ? " · PA" : ""}
                    {op.kind === "sale" && op.workforceRequired
                      ? ` · ${op.workforceRequired} FL`
                      : ""}
                    {op.contractMonths
                      ? ` · Contratto ${op.contractMonths} mesi`
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
