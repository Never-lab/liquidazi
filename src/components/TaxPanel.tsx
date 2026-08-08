import { dueF24Total } from "../sim/selectors";
import { f24BlockedByCollection } from "../sim/collection";
import { f24PayHint } from "../ui/controlHints";
import { useGameStore } from "../store/gameStore";
import { formatCash } from "./formatCash";
import { Hint } from "./ui/Hint";
import styles from "./panels.module.css";

const KIND_LABEL: Record<string, string> = {
  IVA: "IVA",
  IRPEF: "Ritenute IRPEF",
  INPS: "Contributi INPS",
  IRES: "IRES",
  IRAP: "IRAP",
};

const STAGE_LABEL: Record<string, string> = {
  cartella: "Cartella di pagamento",
  rateazione: "Rateazione",
  enforcement: "Pignoramento / riscossione",
  terminal: "Chiusura per insolvenza fiscale",
};

export const TaxPanel = () => {
  const game = useGameStore((s) => s.game);
  const doPayF24 = useGameStore((s) => s.payF24);

  const openLiabilities = game.liabilities.filter((l) => !l.paid);
  const dueNow = dueF24Total(game);
  const c = game.collectionCase;
  const f24Blocked = f24BlockedByCollection(game);

  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Debiti fiscali</h2>

      {game.vat.credit > 0 && (
        <p className={styles.muted}>
          Credito IVA a riporto: {formatCash(game.vat.credit)}
        </p>
      )}

      {c && (
        <div className={styles.list} style={{ marginBottom: 12 }}>
          <p className={styles.danger}>
            <strong>Riscossione — {STAGE_LABEL[c.stage] ?? c.stage}</strong>
          </p>
          <ul className={styles.list}>
            <li>
              <span>Debito in gestione</span>
              <span>{formatCash(c.principal)}</span>
            </li>
            <li>
              <span>Mesi in questo stage</span>
              <span>{c.monthsInStage}</span>
            </li>
            {c.plan && (
              <li>
                <span>
                  Rata ({c.plan.totalMonths - c.plan.monthsLeft + 1}/{c.plan.totalMonths})
                </span>
                <span>{formatCash(c.plan.installment)}</span>
              </li>
            )}
          </ul>
        </div>
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
        <Hint text={f24PayHint({ dueNow, blocked: f24Blocked })}>
          <button
            className={styles.button}
            disabled={dueNow <= 0 || f24Blocked}
            onClick={doPayF24}
          >
            Paga F24 ({formatCash(dueNow)})
          </button>
        </Hint>
      </div>
      {f24Blocked && (
        <p className={styles.muted}>
          F24 bloccato: gestisci il debito in riscossione (cartella / pignoramento).
        </p>
      )}
      <p className={styles.muted}>
        Scadenza F24: giorno 16 del mese successivo alla competenza. Insoluto
        prolungato → cartella, rateazione o pignoramento.
      </p>
      <p className={styles.muted}>
        Compliance: {game.compliance}/100
        {(game.monthsTaxOverdue ?? 0) === 0 &&
        game.collectionCase?.stage !== "cartella" &&
        game.collectionCase?.stage !== "enforcement" &&
        game.collectionCase?.stage !== "terminal"
          ? " — in regola: +3/mese"
          : ""}
        {game.compliance < 70
          ? " — sotto 70 la banca alza lo spread; sotto 40 anche il tetto fido."
          : ""}
      </p>
    </section>
  );
};
