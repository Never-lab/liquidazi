import { useEffect, useState } from "react";
import { submitRun } from "../api/client";
import { formatCash } from "../components/formatCash";
import { CAMPAIGN_WIN_MONTHS, LOSE_MONTHS_BELOW_ZERO } from "../sim/types";
import { useGameStore } from "../store/gameStore";
import styles from "./MenuScreen.module.css";

export const EndScreen = () => {
  const game = useGameStore((s) => s.game);
  const auth = useGameStore((s) => s.auth);
  const setScreen = useGameStore((s) => s.setScreen);
  const continueAfterWin = useGameStore((s) => s.continueAfterWin);
  const markRunSubmitted = useGameStore((s) => s.markRunSubmitted);
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [msg, setMsg] = useState("");
  const won = game.status === "won";

  useEffect(() => {
    if (!auth || game.career.submitted || game.monthsPlayed < 1) return;
    if (game.status !== "lost" && game.status !== "won") return;
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

  return (
    <div className={`${styles.shell} ${styles.ko}`}>
      <p className={styles.brandMark}>Liquidazi</p>
      <h2 className={styles.headline}>Liquidità esaurita.</h2>
      <p className={styles.outcome}>
        {LOSE_MONTHS_BELOW_ZERO} mesi in rosso dopo {game.monthsPlayed} mesi. Cassa finale:{" "}
        {formatCash(game.company.cash)}.
        {game.distressLoanTaken ? " Hai già usato il prestito di emergenza." : ""}
      </p>
      {status === "ok" && <p className={styles.ok}>{msg}</p>}
      {status === "err" && <p className={styles.error}>{msg}</p>}
      {status === "sending" && <p className={styles.lede}>Pubblicazione in corso…</p>}
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
    </div>
  );
};
