import { useEffect, useState } from "react";
import { submitRun } from "../api/client";
import { formatCash } from "../components/formatCash";
import { LOSE_MONTHS_BELOW_ZERO } from "../sim/types";
import { useGameStore } from "../store/gameStore";
import styles from "./MenuScreen.module.css";

export const EndScreen = () => {
  const game = useGameStore((s) => s.game);
  const auth = useGameStore((s) => s.auth);
  const setScreen = useGameStore((s) => s.setScreen);
  const markRunSubmitted = useGameStore((s) => s.markRunSubmitted);
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!auth || game.career.submitted || game.monthsPlayed < 1) return;
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
    })
      .then(() => {
        if (cancelled) return;
        markRunSubmitted();
        setStatus("ok");
        setMsg("Run pubblicata in classifica.");
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

  return (
    <div className={`${styles.menu} ${styles.ko}`}>
      <h2 className={styles.title}>Liquidità esaurita</h2>
      <p className={styles.outcome}>
        {LOSE_MONTHS_BELOW_ZERO} mesi consecutivi in rosso dopo {game.monthsPlayed} mesi di attività.
        Cassa finale: {formatCash(game.company.cash)}.
        {game.distressLoanTaken
          ? " Nemmeno il prestito di salvataggio è bastato."
          : " Senza credito (o dopo averlo rifiutato) non si regge un anno sotto zero."}
      </p>
      <p className={styles.subtitle}>
        Picco cassa {formatCash(game.career.peakCash)} · debito max{" "}
        {formatCash(game.career.peakDebt)} · fatturato{" "}
        {formatCash(game.career.lifetimeRevenue)}
      </p>
      {status === "sending" && <p className={styles.subtitle}>Pubblicazione run…</p>}
      {status === "ok" && <p className={styles.ok}>{msg}</p>}
      {status === "err" && <p className={styles.error}>{msg}</p>}
      <div className={styles.actions}>
        <button className={styles.primary} onClick={() => setScreen("leaderboard")}>
          Classifiche
        </button>
        <button className={styles.secondary} onClick={() => setScreen("setup")}>
          Nuova partita
        </button>
        <button className={styles.secondary} onClick={() => setScreen("menu")}>
          Menu
        </button>
      </div>
    </div>
  );
};
