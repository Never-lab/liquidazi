import { useEffect, useState } from "react";
import {
  fetchBoards,
  fetchLeaderboard,
  type LeaderboardBoard,
  type LeaderboardEntry,
} from "../api/client";
import { formatCash } from "../components/formatCash";
import { useGameStore } from "../store/gameStore";
import styles from "./MenuScreen.module.css";

const valueFor = (board: LeaderboardBoard, e: LeaderboardEntry): string => {
  if (board === "longest" || board === "shortest") return `${e.monthsPlayed} mesi`;
  if (board === "debt") return formatCash(e.peakDebt);
  if (board === "cash") return formatCash(e.peakCash);
  return formatCash(e.lifetimeRevenue);
};

export const LeaderboardScreen = () => {
  const setScreen = useGameStore((s) => s.setScreen);
  const [boards, setBoards] = useState<{ id: LeaderboardBoard; label: string }[]>([]);
  const [board, setBoard] = useState<LeaderboardBoard>("longest");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchBoards()
      .then(setBoards)
      .catch((e) => setError(e instanceof Error ? e.message : "API offline"));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    void fetchLeaderboard(board)
      .then((r) => {
        setEntries(r.entries);
        setLabel(r.label);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Errore classifica"))
      .finally(() => setLoading(false));
  }, [board]);

  return (
    <div className={styles.menuWide}>
      <h2 className={styles.title}>Classifiche</h2>
      <p className={styles.subtitle}>
        Classifiche globali. <span style={{ color: "#22c55e" }}>●</span> = run ancora in corso.
      </p>

      <div className={styles.boardTabs}>
        {(boards.length
          ? boards
          : [
              { id: "longest" as const, label: "Sopravvivenza" },
              { id: "shortest" as const, label: "Run corta" },
              { id: "debt" as const, label: "Debito" },
              { id: "cash" as const, label: "Cassa" },
              { id: "revenue" as const, label: "Fatturato" },
            ]
        ).map((b) => (
          <button
            key={b.id}
            type="button"
            className={board === b.id ? styles.tabActive : styles.tab}
            onClick={() => setBoard(b.id)}
          >
            {b.label}
          </button>
        ))}
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {loading ? (
        <p className={styles.subtitle}>Caricamento…</p>
      ) : entries.length === 0 ? (
        <p className={styles.subtitle}>Ancora nessuna run. Fallisci con stile.</p>
      ) : (
        <>
          <p className={styles.boardLabel}>{label}</p>
          <ol className={styles.leaderList}>
            {entries.map((e) => (
              <li key={`${e.username}-${e.createdAt}-${e.rank}`}>
                <span className={styles.rank}>#{e.rank}</span>
                <span className={styles.leaderMain}>
                  <strong>
                    {e.outcome === "won" && (
                      <span style={{ color: "#22c55e", marginRight: 4 }} title="Run in corso">●</span>
                    )}
                    {e.username}
                  </strong>
                  <span className={styles.leaderMeta}>
                    {e.companyName} · {e.sector}
                  </span>
                </span>
                <span className={styles.leaderValue}>{valueFor(board, e)}</span>
              </li>
            ))}
          </ol>
        </>
      )}

      <div className={styles.actions}>
        <button className={styles.secondary} onClick={() => setScreen("menu")}>
          Menu
        </button>
      </div>
    </div>
  );
};
