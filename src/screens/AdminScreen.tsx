import { useEffect, useState } from "react";
import { fetchAdminStats, type AdminStats } from "../api/client";
import { useGameStore } from "../store/gameStore";
import styles from "./MenuScreen.module.css";

const fmtBytes = (n: number) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

export const AdminScreen = () => {
  const setScreen = useGameStore((s) => s.setScreen);
  const auth = useGameStore((s) => s.auth);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth?.token || !auth.admin) {
      setError("Solo admin");
      setLoading(false);
      return;
    }
    setLoading(true);
    void fetchAdminStats(auth.token)
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : "Errore stats"))
      .finally(() => setLoading(false));
  }, [auth?.token, auth?.admin]);

  return (
    <div className={styles.menuWide}>
      <h2 className={styles.title}>Controllo</h2>
      <p className={styles.subtitle}>Contatori server · sola lettura · solo il tuo utente admin.</p>

      {error && <p className={styles.error}>{error}</p>}
      {loading ? (
        <p className={styles.subtitle}>Caricamento…</p>
      ) : stats ? (
        <>
          <ul className={styles.adminStats}>
            <li>
              <span>Utenti</span>
              <strong>{stats.users}</strong>
            </li>
            <li>
              <span>Run totali</span>
              <strong>{stats.runs}</strong>
            </li>
            <li>
              <span>Run 24h / 7g</span>
              <strong>
                {stats.runs24h} / {stats.runs7d}
              </strong>
            </li>
            <li>
              <span>Save cloud</span>
              <strong>{stats.cloudSaves}</strong>
            </li>
            <li>
              <span>Segnalazioni</span>
              <strong>{stats.feedbackCount}</strong>
            </li>
            <li>
              <span>Media mesi / record</span>
              <strong>
                {stats.avgMonths} / {stats.longestMonths}
              </strong>
            </li>
            <li>
              <span>Dati / storage</span>
              <strong>
                {fmtBytes(stats.dataBytes)} · {stats.storage}
              </strong>
            </li>
          </ul>

          <p className={styles.boardLabel}>Ultime segnalazioni</p>
          {stats.recentFeedback.length === 0 ? (
            <p className={styles.subtitle}>Nessuna segnalazione ancora.</p>
          ) : (
            <ol className={styles.leaderList}>
              {stats.recentFeedback.map((f) => (
                <li key={f.id} className={styles.feedbackItem}>
                  <span className={styles.leaderMain}>
                    <strong>
                      {f.kind === "bug" ? "Bug" : "Idea"}
                      {f.username ? ` · ${f.username}` : " · ospite"}
                    </strong>
                    <span className={styles.leaderMeta}>{f.message}</span>
                    {f.contact ? (
                      <span className={styles.leaderMeta}>Contatto: {f.contact}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ol>
          )}

          <p className={styles.boardLabel}>Ultime 5 run</p>
          {stats.recent.length === 0 ? (
            <p className={styles.subtitle}>Nessuna run ancora.</p>
          ) : (
            <ol className={styles.leaderList}>
              {stats.recent.map((r) => (
                <li key={`${r.username}-${r.createdAt}`}>
                  <span className={styles.leaderMain}>
                    <strong>{r.username}</strong>
                    <span className={styles.leaderMeta}>
                      {r.companyName}
                      {r.city ? ` · ${r.city}` : ""}
                    </span>
                  </span>
                  <span className={styles.leaderValue}>{r.monthsPlayed} mesi</span>
                </li>
              ))}
            </ol>
          )}
        </>
      ) : null}

      <div className={styles.actions}>
        <button type="button" className={styles.secondary} onClick={() => setScreen("menu")}>
          Menu
        </button>
      </div>
    </div>
  );
};
