import { useEffect, useState, type FormEvent } from "react";
import { ApiError, submitFeedback, submitRun } from "../api/client";
import { formatCash } from "../components/formatCash";
import { DIFFICULTIES } from "../config/difficulty";
import { CAMPAIGN_WIN_MONTHS, LOSE_MONTHS_BELOW_ZERO } from "../sim/types";
import { useGameStore } from "../store/gameStore";
import styles from "./MenuScreen.module.css";

type SecondRun = "yes" | "maybe" | "no";

const SECOND_RUN_LABEL: Record<SecondRun, string> = {
  yes: "Sì",
  maybe: "Forse",
  no: "No",
};

export const EndScreen = () => {
  const game = useGameStore((s) => s.game);
  const auth = useGameStore((s) => s.auth);
  const setScreen = useGameStore((s) => s.setScreen);
  const continueAfterWin = useGameStore((s) => s.continueAfterWin);
  const markRunSubmitted = useGameStore((s) => s.markRunSubmitted);
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [msg, setMsg] = useState("");
  const won = game.status === "won";

  const [unclear, setUnclear] = useState("");
  const [secondRun, setSecondRun] = useState<SecondRun | "">("");
  const [pmBusy, setPmBusy] = useState(false);
  const [pmError, setPmError] = useState("");
  const [pmDone, setPmDone] = useState(false);
  const [pmSkipped, setPmSkipped] = useState(false);

  useEffect(() => {
    if (!auth || game.monthsPlayed < 1) return;
    if (game.status !== "lost" && game.status !== "won") return;
    const submittedMonths = game.career.submittedMonths ?? (game.career.submitted ? game.monthsPlayed : 0);
    if (game.career.submitted && submittedMonths >= game.monthsPlayed) return;
    let cancelled = false;
    setStatus("sending");
    void submitRun(auth.token, {
      companyName: game.company.name,
      city: game.company.city,
      sector: game.company.sector,
      monthsPlayed: game.monthsPlayed,
      peakCash: game.career.peakCash,
      peakDebt: game.career.peakDebt,
      lifetimeRevenue: game.career.lifetimeRevenue,
      finalCash: game.company.cash,
      difficulty: game.difficulty ?? "normal",
      outcome: game.status === "won" ? "won" : "lost",
      slotIndex: useGameStore.getState().activeSlot,
    })
      .then(() => {
        if (cancelled) return;
        markRunSubmitted();
        setStatus("ok");
        setMsg(
          game.status === "won"
            ? "Run (vittoria) registrata per il bilanciamento."
            : "Run pubblicata in classifica.",
        );
      })
      .catch((e) => {
        if (cancelled) return;
        setStatus("err");
        setMsg(e instanceof Error ? e.message : "Invio fallito");
      });
    return () => {
      cancelled = true;
    };
  }, [auth, game, markRunSubmitted]);

  const sendPostmortem = async (e: FormEvent) => {
    e.preventDefault();
    if (!secondRun) {
      setPmError("Scegli se faresti una seconda run.");
      return;
    }
    setPmError("");
    setPmBusy(true);
    const diff = DIFFICULTIES[game.difficulty ?? "normal"];
    const message = [
      "Post-mortem Liquidazi",
      `Mese KO: ${game.monthsPlayed}`,
      `Difficoltà: ${diff.label}`,
      `Settore: ${game.company.sector}`,
      `Cassa finale: ${Math.round(game.company.cash)}`,
      "",
      `Cosa non chiaro (primi 3 min): ${unclear.trim() || "(nessuna risposta)"}`,
      `Seconda run: ${SECOND_RUN_LABEL[secondRun]}`,
    ].join("\n");
    try {
      await submitFeedback(
        { kind: "postmortem", message },
        auth?.token,
      );
      setPmDone(true);
    } catch (err) {
      setPmError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Invio non riuscito",
      );
    } finally {
      setPmBusy(false);
    }
  };

  if (won) {
    return (
      <div className={styles.shell}>
        <p className={styles.brandMark}>Liquidazi</p>
        <h2 className={styles.headline}>Anno 2 raggiunto.</h2>
        <p className={styles.outcome}>
          {CAMPAIGN_WIN_MONTHS} mesi in piedi. Cassa {formatCash(game.company.cash)}. Puoi
          fermarti o continuare.
        </p>
        <p className={styles.lede}>
          Picco {formatCash(game.career.peakCash)} · fatturato{" "}
          {formatCash(game.career.lifetimeRevenue)}
        </p>
        {status === "ok" && <p className={styles.ok}>{msg}</p>}
        {status === "err" && <p className={styles.error}>{msg}</p>}
        <div className={styles.ctaRow}>
          <button type="button" className={styles.primary} onClick={continueAfterWin}>
            Continua
          </button>
          <button type="button" className={styles.secondary} onClick={() => setScreen("menu")}>
            Menu
          </button>
        </div>
        <nav className={styles.secondaryNav} aria-label="Altro">
          <button type="button" className={styles.navLink} onClick={() => setScreen("setup")}>
            Nuova partita
          </button>
        </nav>
      </div>
    );
  }

  const diffLabel = DIFFICULTIES[game.difficulty ?? "normal"].label;
  const showPostmortem = !pmDone && !pmSkipped;
  const fiscalLose = game.loseReason === "fiscal";

  return (
    <div className={`${styles.shell} ${styles.ko}`}>
      <p className={styles.brandMark}>Liquidazi</p>
      <h2 className={styles.headline}>
        {fiscalLose ? "Chiusura per insolvenza fiscale." : "Liquidità esaurita."}
      </h2>
      <p className={styles.outcome}>
        {fiscalLose ? (
          <>
            La riscossione non è riuscita a chiudere il debito dopo {game.monthsPlayed} mesi.
            Cassa finale: {formatCash(game.company.cash)}.
            {game.collectionCase
              ? ` Residuo in cartella: ${formatCash(game.collectionCase.principal)}.`
              : ""}
          </>
        ) : (
          <>
            {LOSE_MONTHS_BELOW_ZERO} mesi in rosso dopo {game.monthsPlayed} mesi. Cassa finale:{" "}
            {formatCash(game.company.cash)}.
            {game.distressLoanTaken ? " Hai già usato il prestito di emergenza." : ""}
          </>
        )}
      </p>
      {status === "ok" && <p className={styles.ok}>{msg}</p>}
      {status === "err" && <p className={styles.error}>{msg}</p>}
      {status === "sending" && <p className={styles.lede}>Pubblicazione in corso…</p>}

      {showPostmortem ? (
        <form className={styles.postmortem} onSubmit={(e) => void sendPostmortem(e)}>
          <h3 className={styles.postmortemTitle}>30 secondi di post-mortem</h3>
          <p className={styles.subtitle}>
            Non “ti è piaciuto?” — ci serve capire dove si rompe il gioco. Anche da ospite.
          </p>
          <p className={styles.postmortemFacts}>
            Morto al mese <strong>{game.monthsPlayed}</strong> · difficoltà{" "}
            <strong>{diffLabel}</strong> · {game.company.sector}
          </p>

          <label className={styles.field}>
            Cosa non hai capito nei primi 3 minuti?
            <textarea
              rows={3}
              maxLength={800}
              value={unclear}
              onChange={(e) => setUnclear(e.target.value)}
              placeholder="Obiettivo, F24, come fatturare, cosa faceva male la cassa…"
            />
          </label>

          <fieldset className={styles.postmortemChoice}>
            <legend>Torneresti a fare una seconda run?</legend>
            {(
              [
                ["yes", "Sì"],
                ["maybe", "Forse"],
                ["no", "No"],
              ] as const
            ).map(([id, label]) => (
              <label key={id} className={styles.postmortemRadio}>
                <input
                  type="radio"
                  name="secondRun"
                  value={id}
                  checked={secondRun === id}
                  onChange={() => setSecondRun(id)}
                />
                {label}
              </label>
            ))}
          </fieldset>

          {pmError && <p className={styles.error}>{pmError}</p>}

          <div className={styles.ctaRow}>
            <button type="submit" className={styles.primary} disabled={pmBusy}>
              {pmBusy ? "Invio…" : "Invia feedback"}
            </button>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => setPmSkipped(true)}
              disabled={pmBusy}
            >
              Non ora
            </button>
          </div>
        </form>
      ) : (
        <>
          {pmDone && <p className={styles.ok}>Grazie — post-mortem ricevuto.</p>}
          <div className={styles.ctaRow}>
            <button type="button" className={styles.primary} onClick={() => setScreen("setup")}>
              Nuova partita
            </button>
            <button type="button" className={styles.secondary} onClick={() => setScreen("menu")}>
              Menu
            </button>
          </div>
          <nav className={styles.secondaryNav} aria-label="Altro">
            <button type="button" className={styles.navLink} onClick={() => setScreen("leaderboard")}>
              Classifiche
            </button>
          </nav>
        </>
      )}
    </div>
  );
};
