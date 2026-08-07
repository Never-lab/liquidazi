import { useCallback, useEffect, useState } from "react";
import {
  deleteAdminRun,
  fetchAdminStats,
  type AdminStats,
} from "../api/client";
import { formatCash } from "../components/formatCash";
import { useGameStore } from "../store/gameStore";
import styles from "./MenuScreen.module.css";

const fmtBytes = (n: number) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

const DIFF_LABEL: Record<string, string> = {
  easy: "Facile",
  normal: "Normale",
  hard: "Difficile",
  unknown: "Sconosciuta (run vecchie)",
};

const OUTCOME_LABEL: Record<string, string> = {
  won: "vittoria",
  lost: "KO",
};

export const AdminScreen = () => {
  const setScreen = useGameStore((s) => s.setScreen);
  const auth = useGameStore((s) => s.auth);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!auth?.token || !auth.admin) {
      setError("Solo admin");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    void fetchAdminStats(auth.token)
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : "Errore stats"))
      .finally(() => setLoading(false));
  }, [auth?.token, auth?.admin]);

  useEffect(() => {
    reload();
  }, [reload]);

  const onDeleteRun = async (id: string, label: string) => {
    if (!auth?.token) return;
    if (!window.confirm(`Eliminare la run di ${label} dalla classifica/dashboard?`)) {
      return;
    }
    setDeletingId(id);
    setError("");
    try {
      await deleteAdminRun(auth.token, id);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eliminazione fallita");
    } finally {
      setDeletingId(null);
    }
  };

  const bal = stats?.balance;

  return (
    <div className={styles.menuWide}>
      <h2 className={styles.title}>Controllo</h2>
      <p className={styles.subtitle}>
        Contatori server · puoi eliminare run di test dalla lista sotto · solo admin.
      </p>

      {error && <p className={styles.error}>{error}</p>}
      {loading && !stats ? (
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

          <p className={styles.boardLabel}>Bilancio run</p>
          <p className={styles.subtitle}>
            Solo account loggati. Le run senza difficoltà sono precedenti a questo
            monitoraggio. Ospiti non compaiono.
          </p>
          {bal && bal.n > 0 ? (
            <>
              <ul className={styles.adminStats}>
                <li>
                  <span>N / media / mediana mesi</span>
                  <strong>
                    {bal.n} · {bal.avgMonths} · {bal.medianMonths}
                  </strong>
                </li>
                <li>
                  <span>≥12 mesi / ≥24 mesi</span>
                  <strong>
                    {bal.pctGe12}% / {bal.pctGe24}%
                  </strong>
                </li>
                <li>
                  <span>Vittorie / KO (+legacy)</span>
                  <strong>
                    {bal.wins} / {bal.losses}
                    {bal.unknownOutcome ? ` (${bal.unknownOutcome} legacy)` : ""}
                  </strong>
                </li>
                <li>
                  <span>Bucket mesi</span>
                  <strong>
                    1–3:{bal.buckets["1-3"]} · 4–6:{bal.buckets["4-6"]} · 7–12:
                    {bal.buckets["7-12"]} · 13–23:{bal.buckets["13-23"]} · 24+:
                    {bal.buckets["24+"]}
                  </strong>
                </li>
                <li>
                  <span>Media picco cassa / debito / finale</span>
                  <strong>
                    {formatCash(bal.avgPeakCash)} · {formatCash(bal.avgPeakDebt)} ·{" "}
                    {formatCash(bal.avgFinalCash)}
                  </strong>
                </li>
              </ul>

              <p className={styles.boardLabel}>Per difficoltà</p>
              <ol className={styles.leaderList}>
                {Object.entries(bal.byDifficulty)
                  .sort((a, b) => b[1].n - a[1].n)
                  .map(([id, row]) => (
                    <li key={id}>
                      <span className={styles.leaderMain}>
                        <strong>{DIFF_LABEL[id] ?? id}</strong>
                        <span className={styles.leaderMeta}>
                          n={row.n} · media {row.avgMonths}m · ≥12 {row.pctGe12}%
                        </span>
                      </span>
                    </li>
                  ))}
              </ol>

              <p className={styles.boardLabel}>Per settore</p>
              <ol className={styles.leaderList}>
                {Object.entries(bal.bySector)
                  .sort((a, b) => b[1].n - a[1].n)
                  .map(([id, row]) => (
                    <li key={id}>
                      <span className={styles.leaderMain}>
                        <strong>{id}</strong>
                        <span className={styles.leaderMeta}>
                          n={row.n} · media {row.avgMonths}m
                        </span>
                      </span>
                    </li>
                  ))}
              </ol>
            </>
          ) : (
            <p className={styles.subtitle}>Nessuna run ancora da aggregare.</p>
          )}

          <p className={styles.boardLabel}>Ultime segnalazioni</p>
          {stats.recentFeedback.length === 0 ? (
            <p className={styles.subtitle}>Nessuna segnalazione ancora.</p>
          ) : (
            <ol className={styles.leaderList}>
              {stats.recentFeedback.map((f) => (
                <li key={f.id} className={styles.feedbackItem}>
                  <span className={styles.leaderMain}>
                    <strong>
                      {f.kind === "bug"
                        ? "Bug"
                        : f.kind === "postmortem"
                          ? "Post-mortem"
                          : "Idea"}
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

          <p className={styles.boardLabel}>Run in classifica (ultime 40)</p>
          <p className={styles.subtitle}>
            Elimina le run di test: escono da classifica e dal bilancio aggregato.
          </p>
          {stats.recent.length === 0 ? (
            <p className={styles.subtitle}>Nessuna run ancora.</p>
          ) : (
            <ol className={styles.leaderList}>
              {stats.recent.map((r) => {
                const outcome =
                  r.outcome && OUTCOME_LABEL[r.outcome]
                    ? OUTCOME_LABEL[r.outcome]
                    : r.outcome || "—";
                const diff = r.difficulty
                  ? DIFF_LABEL[r.difficulty] ?? r.difficulty
                  : null;
                return (
                  <li key={r.id}>
                    <span className={styles.leaderMain}>
                      <strong>{r.username}</strong>
                      <span className={styles.leaderMeta}>
                        {r.companyName}
                        {r.city ? ` · ${r.city}` : ""}
                        {` · ${outcome}`}
                        {diff ? ` · ${diff}` : ""}
                      </span>
                    </span>
                    <span className={styles.leaderValue}>
                      {r.monthsPlayed} mesi{" "}
                      <button
                        type="button"
                        className={styles.navLink}
                        disabled={deletingId === r.id || loading}
                        onClick={() =>
                          void onDeleteRun(r.id, `${r.username} (${r.monthsPlayed} mesi)`)
                        }
                      >
                        {deletingId === r.id ? "…" : "Elimina"}
                      </button>
                    </span>
                  </li>
                );
              })}
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
