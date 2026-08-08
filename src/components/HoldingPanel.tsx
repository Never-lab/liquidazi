import { CAPEX_EBITDA_MULT } from "../config/holding";
import { estimateSubsidiaryValue } from "../sim/acquisitions";
import { migrateHoldingState } from "../sim/migrateHolding";
import { capexHint } from "../ui/controlHints";
import { formatCash } from "./formatCash";
import { useGameStore } from "../store/gameStore";
import { Hint } from "./ui/Hint";
import styles from "./panels.module.css";

const RISK_LABEL = { low: "basso", med: "medio", high: "alto" } as const;

export const HoldingPanel = () => {
  const rawGame = useGameStore((s) => s.game);
  const buy = useGameStore((s) => s.buyAcquisition);
  const capex = useGameStore((s) => s.investSubsidiaryCapex);
  const listForSale = useGameStore((s) => s.listSubsidiaryForSale);
  const acceptOffer = useGameStore((s) => s.acceptSaleOffer);
  const rejectOffer = useGameStore((s) => s.rejectSaleOffer);

  const game = migrateHoldingState(rawGame);
  const subs = game.subsidiaries;
  const board = game.acquisitionBoard ?? [];
  const offers = game.saleOffers;
  const cap = game.holdingSlotCap;

  return (
    <section className={styles.panelWide}>
      <h2 className={styles.panelTitle}>
        Holding · slot {subs.length}/{cap}
      </h2>
      <p className={styles.muted}>
        Vendere una partecipata genera una plusvalenza (prezzo − costo d'acquisto) che confluisce
        nell'imponibile IRES di fine anno.
      </p>

      {offers.length > 0 && (
        <>
          <h3 className={styles.panelTitle} style={{ marginTop: 12 }}>
            Offerte di acquisto
          </h3>
          <div className={styles.cards}>
            {offers.map((o) => {
              const sub = subs.find((s) => s.id === o.subsidiaryId);
              return (
                <article key={o.id} className={styles.deal}>
                  <div>
                    <h3 className={styles.dealTitle}>{sub?.name ?? "Partecipata"}</h3>
                    <p className={styles.dealMeta}>
                      Offerta {formatCash(o.price)} · scade a m{o.expiresMonthIdx}
                    </p>
                  </div>
                  <div className={styles.dealActions}>
                    <button className={styles.button} onClick={() => acceptOffer(o.id)}>
                      Accetta
                    </button>
                    <button className={styles.buttonSecondary} onClick={() => rejectOffer(o.id)}>
                      Rifiuta
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      <h3 className={styles.panelTitle} style={{ marginTop: 16 }}>
        Partecipate
      </h3>
      <p className={styles.muted}>
        CAPEX: +16% EBITDA, costo ≈ 6× EBITDA mensile. Dopo ogni investimento serve attendere 6 mesi.
      </p>
      {subs.length === 0 ? (
        <p className={styles.muted}>Nessuna partecipata: acquisisci dal tabellone qui sotto.</p>
      ) : (
        <ul className={styles.list}>
          {subs.map((s) => {
            const estimate = estimateSubsidiaryValue(s);
            const capexCost = s.monthlyEbitda * CAPEX_EBITDA_MULT;
            const listed = s.listedUntilMonthIdx != null;
            const onCooldown = s.capexCooldownMonths > 0;
            const shortCash = game.company.cash < capexCost;
            // Listed / cooldown / cash — first matching gate wins in capexHint.
            const capexBlocked = listed || onCooldown || shortCash;
            const hintText = capexHint({
              listed,
              cooldownMonths: s.capexCooldownMonths,
              shortCash,
              costLabel: formatCash(capexCost),
            });
            const capexLabel = listed
              ? "CAPEX · in vendita"
              : onCooldown
                ? `CAPEX · tra ${s.capexCooldownMonths}m`
                : shortCash
                  ? `CAPEX · cassa insufficiente`
                  : `CAPEX · ${formatCash(capexCost)}`;
            return (
              <li key={s.id} style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <strong>{s.name}</strong>
                  <span>{formatCash(s.monthlyEbitda)}/mese</span>
                </div>
                <span className={styles.muted}>
                  rischio {RISK_LABEL[s.risk]} · pagata {formatCash(s.purchasePrice)} · stima{" "}
                  {formatCash(estimate)}
                  {listed ? " · in vendita" : onCooldown ? ` · CAPEX tra ${s.capexCooldownMonths} mesi` : ""}
                </span>
                <div className={styles.dealActions}>
                  <Hint text={hintText}>
                    <button
                      className={styles.buttonSecondary}
                      disabled={capexBlocked}
                      onClick={() => capex(s.id)}
                    >
                      {capexLabel}
                    </button>
                  </Hint>
                  <button
                    className={styles.buttonSecondary}
                    disabled={listed}
                    title={listed ? "Non disponibile mentre è in vendita." : "Apri la finestra di vendita."}
                    onClick={() => listForSale(s.id)}
                  >
                    Metti in vendita
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <h3 className={styles.panelTitle} style={{ marginTop: 16 }}>
        Tabellone acquisizioni
      </h3>
      <p className={styles.muted}>
        Portfolio lite: non è una seconda SRL fiscale. Tabellone si aggiorna ogni 3 mesi.
      </p>
      {board.length === 0 ? (
        <p className={styles.muted}>Nessun target aperto — avanza i mesi.</p>
      ) : (
        <div className={styles.cards}>
          {board.map((t) => {
            const noSlot = subs.length >= cap;
            const shortCash = game.company.cash < t.price;
            const buyBlocked = noSlot || shortCash;
            const buyHint = noSlot
              ? `Slot holding pieni (${subs.length}/${cap}).`
              : shortCash
                ? `Cassa insufficiente (servono ${formatCash(t.price)}).`
                : `Acquista per ${formatCash(t.price)} (usa 1 slot).`;
            return (
              <article key={t.id} className={styles.deal}>
                <div>
                  <h3 className={styles.dealTitle}>{t.name}</h3>
                  <p className={styles.dealMeta}>
                    {t.sector} · {formatCash(t.price)} · EBITDA {formatCash(t.monthlyEbitda)}/mese ·
                    rischio {RISK_LABEL[t.risk]}
                    {t.capacityBonus ? " · +1 slot" : ""}
                  </p>
                </div>
                <div className={styles.dealActions}>
                  <Hint text={buyHint}>
                    <button
                      className={styles.button}
                      disabled={buyBlocked}
                      onClick={() => buy(t.id)}
                    >
                      Acquista
                    </button>
                  </Hint>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
