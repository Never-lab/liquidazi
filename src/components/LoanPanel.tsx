import { useState } from "react";
import {
  buildLoanOffers,
  complianceSpreadPenaltyBps,
  euriborAt,
  fidoMaxFor,
  frenchPayment,
  loanRefusalReason,
  remainingSchedule,
  spreadForGuarantee,
} from "../sim/actions";
import { MAX_OPEN_LOANS, openLoans } from "../sim/loans";
import type { LoanGuarantee } from "../sim/types";
import { loanOfferHint } from "../ui/controlHints";
import { useGameStore } from "../store/gameStore";
import { formatCash } from "./formatCash";
import { Hint } from "./ui/Hint";
import styles from "./panels.module.css";

const GUARANTEE_LABEL: Record<LoanGuarantee, string> = {
  none: "Nessuna garanzia",
  fondo_garanzia_pmi: "Fondo di Garanzia PMI",
  fideiussione: "Fideiussione personale",
};

const formatPct = (rate: number): string => `${(rate * 100).toFixed(2)}%`;

export const LoanPanel = () => {
  const game = useGameStore((s) => s.game);
  const doRequestLoan = useGameStore((s) => s.requestLoan);
  const doAcceptOffer = useGameStore((s) => s.acceptLoanOffer);
  const doDeclineOffer = useGameStore((s) => s.declineLoanOffer);
  const doRequestFido = useGameStore((s) => s.requestFido);
  const doDrawFido = useGameStore((s) => s.drawFido);

  const loans = openLoans(game);
  const [personalizza, setPersonalizza] = useState(false);
  const [principal, setPrincipal] = useState("10000");
  const [tenor, setTenor] = useState("12");
  const [rateType, setRateType] = useState<"fixed" | "floating">("fixed");
  const [guarantee, setGuarantee] = useState<LoanGuarantee>("none");
  const [fidoLimit, setFidoLimit] = useState("8000");
  const [fidoDraw, setFidoDraw] = useState("2000");
  const [refinanceId, setRefinanceId] = useState<number | "">("");

  const fido = game.fido;
  const fidoCap = fidoMaxFor(game);
  const rescueOffer = game.loanOffer;
  const spreadPen = complianceSpreadPenaltyBps(game.compliance);
  const canAddLoan = loans.length < MAX_OPEN_LOANS;
  const refiId = refinanceId === "" ? undefined : refinanceId;

  const customPrincipal = Number(principal);
  const customTenor = Number(tenor);
  const customSpreadBps = spreadForGuarantee(guarantee) + spreadPen;
  const customAnnualRate = euriborAt(game.monthsPlayed) + customSpreadBps / 10000;
  const customPayment = frenchPayment(customPrincipal, customAnnualRate, customTenor);
  const customRefusal = loanRefusalReason(game, customPrincipal, guarantee, refiId);

  const showOffers = canAddLoan || refiId != null;

  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Credito</h2>

      <p className={styles.muted}>
        Compliance {Math.round(game.compliance)}/100
        {spreadPen > 0 ? ` · spread +${spreadPen} bps` : " · spread standard"}
        {" · "}
        tetto fido {formatCash(fidoCap)} · mutui {loans.length}/{MAX_OPEN_LOANS}
        {game.compliance < 100 && (game.monthsTaxOverdue ?? 0) === 0
          ? " · in regola: +3 compliance/mese"
          : ""}
      </p>

      {game.compliance < 70 && (
        <p className={styles.warning}>
          Compliance sotto 70: condizioni banca peggiori
          {game.compliance < 40 ? " e tetto fido ridotto." : "."}
        </p>
      )}

      {rescueOffer && (
        <div className={styles.closePreview}>
          <p className={styles.closePreviewTitle}>Offerta di salvataggio</p>
          <p className={styles.closePreviewNums}>
            {formatCash(rescueOffer.principal)} · {rescueOffer.tenorMonths} mesi
            {rescueOffer.guarantee === "fondo_garanzia_pmi" ? " · Fondo di Garanzia PMI" : ""}
          </p>
          <p className={styles.muted}>
            La cassa è in rosso: la banca propone questo mutuo per rientrare. Rifiutare non chiude
            subito la partita, ma resti esposto.
          </p>
          <div className={styles.row}>
            <button type="button" className={styles.button} onClick={doAcceptOffer}>
              Accetta
            </button>
            <button type="button" className={styles.buttonSecondary} onClick={doDeclineOffer}>
              Rifiuta
            </button>
          </div>
        </div>
      )}

      {loans.map((loan) => {
        const annual =
          loan.rateType === "fixed"
            ? (loan.fixedAnnualRate ?? 0)
            : euriborAt(game.monthsPlayed) + loan.spreadBps / 10000;
        const monthsLeft = loan.tenorMonths - loan.monthsPaid;
        const schedule = remainingSchedule(loan.outstanding, annual, monthsLeft);
        return (
          <div key={loan.id} style={{ marginBottom: 16 }}>
            <p className={styles.closePreviewTitle}>
              Mutuo #{loan.id}
              {refinanceId === loan.id ? " · in rifinanziamento" : ""}
            </p>
            <ul className={styles.list}>
              <li>
                <span>Debito residuo</span>
                <span>{formatCash(loan.outstanding)}</span>
              </li>
              <li>
                <span>Tasso</span>
                <span>
                  {loan.rateType === "fixed" ? "Fisso" : "Variabile"} · {formatPct(annual)}
                </span>
              </li>
              <li>
                <span>Garanzia</span>
                <span>{GUARANTEE_LABEL[loan.guarantee]}</span>
              </li>
              <li>
                <span>Rata mensile</span>
                <span>{formatCash(loan.monthlyPayment)}</span>
              </li>
              <li>
                <span>Mesi residui</span>
                <span>
                  {Math.max(0, monthsLeft)} / {loan.tenorMonths}
                </span>
              </li>
              {loan.lastInstallment && (
                <li>
                  <span>Ultima rata</span>
                  <span>
                    {formatCash(
                      loan.lastInstallment.principal + loan.lastInstallment.interest,
                    )}{" "}
                    (int. {formatCash(loan.lastInstallment.interest)})
                  </span>
                </li>
              )}
            </ul>
            {schedule.length > 0 && schedule.length <= 36 && (
              <>
                <p className={styles.scheduleSection}>Piano residuo</p>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Rata</th>
                        <th>Capitale</th>
                        <th>Interessi</th>
                        <th>Totale</th>
                        <th>Residuo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedule.slice(0, 12).map((row) => (
                        <tr key={row.monthIndex}>
                          <td>{row.monthIndex}</td>
                          <td>{formatCash(row.principal)}</td>
                          <td>{formatCash(row.interest)}</td>
                          <td>{formatCash(row.payment)}</td>
                          <td>{formatCash(row.residual)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {schedule.length > 12 && (
                  <p className={styles.muted}>… altre {schedule.length - 12} rate</p>
                )}
              </>
            )}
          </div>
        );
      })}

      {showOffers && (
        <>
          {loans.length > 0 && (
            <div className={styles.row}>
              <label className={styles.muted}>
                Rifinanzia (chiude un mutuo col nuovo importo){" "}
                <select
                  className={styles.input}
                  value={refinanceId === "" ? "" : String(refinanceId)}
                  onChange={(e) =>
                    setRefinanceId(e.target.value === "" ? "" : Number(e.target.value))
                  }
                >
                  <option value="">No — nuovo mutuo (se c’è posto)</option>
                  {loans.map((l) => (
                    <option key={l.id} value={l.id}>
                      Mutuo #{l.id} · residuo {formatCash(l.outstanding)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <div className={styles.cards}>
            {buildLoanOffers(game, refiId).map((offer) => (
              <article key={offer.id} className={styles.deal}>
                <div>
                  <h3 className={styles.dealTitle}>{offer.label}</h3>
                  <p className={styles.dealMeta}>
                    {formatCash(offer.principal)} · {offer.tenorMonths} mesi ·{" "}
                    {GUARANTEE_LABEL[offer.guarantee]}
                    <br />
                    rata {formatCash(offer.monthlyPayment)}/mese · TAN{" "}
                    {formatPct(offer.annualRate)}
                  </p>
                  {offer.disabledReason && (
                    <p className={styles.warning}>{offer.disabledReason}</p>
                  )}
                </div>
                <div className={styles.dealActions}>
                  <Hint
                    text={
                      loanOfferHint(offer.disabledReason) ??
                      (refiId != null
                        ? "Rifinanzia questo mutuo con la nuova offerta."
                        : "Richiedi questo mutuo.")
                    }
                  >
                    <button
                      type="button"
                      className={styles.button}
                      disabled={!!offer.disabledReason}
                      onClick={() =>
                        doRequestLoan({
                          principal: offer.principal,
                          tenorMonths: offer.tenorMonths,
                          rateType: offer.rateType,
                          guarantee: offer.guarantee,
                          refinanceLoanId: refiId,
                        })
                      }
                    >
                      {refiId != null ? "Rifinanzia" : "Richiedi"}
                    </button>
                  </Hint>
                </div>
              </article>
            ))}
          </div>

          <button
            type="button"
            className={styles.toggle}
            onClick={() => setPersonalizza((v) => !v)}
          >
            {personalizza ? "Nascondi personalizza" : "Personalizza mutuo"}
          </button>

          {personalizza && (
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
                  <option value="48">48 mesi</option>
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
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <p className={styles.muted}>
                Rata stimata {formatCash(customPayment)}/mese · TAN {formatPct(customAnnualRate)}
              </p>
              <div className={styles.row}>
                <Hint
                  text={
                    customRefusal ??
                    (refiId != null
                      ? "Rifinanzia con i parametri personalizzati."
                      : "Richiedi mutuo con i parametri personalizzati.")
                  }
                >
                  <button
                    type="button"
                    className={styles.button}
                    disabled={!!customRefusal}
                    onClick={() =>
                      doRequestLoan({
                        principal: customPrincipal,
                        tenorMonths: customTenor,
                        rateType,
                        guarantee,
                        refinanceLoanId: refiId,
                      })
                    }
                  >
                    {refiId != null ? "Rifinanzia mutuo" : "Richiedi mutuo"}
                  </button>
                </Hint>
                {customRefusal && <span className={styles.warning}>{customRefusal}</span>}
              </div>
            </>
          )}
        </>
      )}

      {!showOffers && (
        <p className={styles.muted}>
          Hai 2 mutui aperti. Scegli “Rifinanzia” su uno di essi (menu sopra) oppure attendi la
          chiusura di un piano.
        </p>
      )}

      <h3 className={styles.panelTitle} style={{ marginTop: 16 }}>
        Fido di cassa
      </h3>
      {fido ? (
        <>
          <ul className={styles.list}>
            <li>
              <span>Accordato</span>
              <span>{formatCash(fido.limit)}</span>
            </li>
            <li>
              <span>Utilizzato</span>
              <span>{formatCash(fido.drawn)}</span>
            </li>
            <li>
              <span>Disponibile</span>
              <span>{formatCash(fido.limit - fido.drawn)}</span>
            </li>
            {fido.lastInterest != null && (
              <li>
                <span>Interessi ultimo mese</span>
                <span>{formatCash(fido.lastInterest)}</span>
              </li>
            )}
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
              type="button"
              className={styles.buttonSecondary}
              disabled={fido.drawn >= fido.limit}
              title={
                fido.drawn >= fido.limit
                  ? "Fido già interamente utilizzato."
                  : "Preleva dal fido di cassa (interessi mensili sullo scoperto)."
              }
              onClick={() => doDrawFido(Number(fidoDraw))}
            >
              Preleva
            </button>
          </div>
          <p className={styles.muted}>
            Interessi mensili sullo scoperto; rimborso automatico se torni in positivo.
          </p>
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
            type="button"
            className={styles.buttonSecondary}
            disabled={!(Number(fidoLimit) > 0) || Number(fidoLimit) > fidoCap}
            title={
              !(Number(fidoLimit) > 0)
                ? "Indica un limite fido maggiore di zero."
                : Number(fidoLimit) > fidoCap
                  ? `Limite oltre il massimo (${formatCash(fidoCap)}).`
                  : `Apri fido fino a ${formatCash(fidoCap)} in base a compliance e garanzie.`
            }
            onClick={() => doRequestFido(Number(fidoLimit))}
          >
            Apri fido (max {formatCash(fidoCap)})
          </button>
        </div>
      )}

      <p className={styles.muted}>
        Fino a 2 mutui in parallelo, oppure rifinanzia (il nuovo chiude il residuo del vecchio e
        accredita solo il netto). Il Fondo PMI non è un contributo a fondo perduto.
      </p>
    </section>
  );
};
