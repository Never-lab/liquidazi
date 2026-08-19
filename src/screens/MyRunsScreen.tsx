import { useEffect, useState } from "react";
import { fetchMyRuns, type PersonalRun } from "../api/client";
import { formatCash } from "../components/formatCash";
import { useGameStore } from "../store/gameStore";
import styles from "./MenuScreen.module.css";

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
};

const DIFF_LABEL: Record<string, string> = {
  easy: "Facile",
  normal: "Normale",
  hard: "Difficile",
};

export const MyRunsScreen = () => {
  const setScreen = useGameStore((s) => s.setScreen);
  const auth = useGameStore((s) => s.auth);
  const [runs, setRuns] = useState<PersonalRun[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth?.token) {
      setLoading(false);
      return;
    }
    void fetchMyRuns(auth.token)
      .then((r) => setRuns(r.runs))
      .catch((e) => setError(e instanceof Error ? e.message : "Errore caricamento"))
      .finally(() => setLoading(false));
  }, [auth]);

  return (
    <div className={styles.menuWide}>
      <h2 className={styles.title}>Le tue run</h2>
      <p className={styles.subtitle}>
        Storico completo delle tue partite registrate.
      </p>

      {!auth && (
        <p className={styles.subtitle}>
          Accedi per vedere le tue run.
        </p>
      )}
      {error && <p className={styles.error}>{error}</p>}
      {loading ? (
        <p className={styles.subtitle}>Caricamento…</p>
      ) : runs.length === 0 && auth ? (
        <p className={styles.subtitle}>Nessuna run registrata ancora.</p>
      ) : (
        <ol className={styles.leaderList}>
          {runs.map((r) => (
            <li key={r.id}>
              <span className={styles.leaderMain}>
                <strong>
                  {r.outcome === "won" && (
                    <span style={{ color: "#22c55e", marginRight: 4 }} title="Run in corso">●</span>
                  )}
                  {r.companyName}
                </strong>
                <span className={styles.leaderMeta}>
                  {r.sector} · {r.monthsPlayed} mesi ·{" "}
                  {DIFF_LABEL[r.difficulty ?? ""] ?? r.difficulty ?? "—"}
                </span>
                <span className={styles.leaderMeta}>
                  Cassa picco {formatCash(r.peakCash)} · Fatturato{" "}
                  {formatCash(r.lifetimeRevenue)} · Finale {formatCash(r.finalCash)}
                </span>
                <span className={styles.leaderMeta} style={{ opacity: 0.6, fontSize: "0.85em" }}>
                  {fmtDate(r.createdAt)}
                  {r.updatedAt && r.updatedAt !== r.createdAt && ` · agg. ${fmtDate(r.updatedAt)}`}
                  {r.slotIndex != null && ` · Slot ${r.slotIndex + 1}`}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}

      <div className={styles.actions}>
        <button className={styles.secondary} onClick={() => setScreen("menu")}>
          Menu
        </button>
      </div>
    </div>
  );
};
