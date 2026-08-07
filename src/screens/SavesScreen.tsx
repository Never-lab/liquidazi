import { formatCash } from "../components/formatCash";
import { DIFFICULTIES } from "../config/difficulty";
import { cityById } from "../config/market";
import { useGameStore } from "../store/gameStore";
import styles from "./MenuScreen.module.css";

export const SavesScreen = () => {
  const slots = useGameStore((s) => s.slots);
  const activeSlot = useGameStore((s) => s.activeSlot);
  const selectSlot = useGameStore((s) => s.selectSlot);
  const renameSlot = useGameStore((s) => s.renameSlot);
  const clearSlot = useGameStore((s) => s.clearSlot);
  const setScreen = useGameStore((s) => s.setScreen);

  return (
    <div className={styles.menuWide}>
      <h2 className={styles.title}>Salvataggi</h2>
      <p className={styles.subtitle}>
        Tre slot. Con account loggato vengono sincronizzati sul cloud: dopo Esci /
        Accedi puoi riprendere la partita in corso.
      </p>

      <ul className={styles.slotList}>
        {slots.map((slot, i) => {
          const g = slot.game;
          const city = g ? cityById(g.company.city) : null;
          const diff = g ? DIFFICULTIES[g.difficulty ?? "normal"].label : null;
          const active = i === activeSlot;
          const running = g && g.monthsPlayed > 0 && g.status === "running";
          const statusLabel =
            !g || g.monthsPlayed < 1
              ? "Vuoto"
              : g.status === "lost"
                ? "KO"
                : g.status === "won"
                  ? "Traguardo 24m"
                  : "In corso";
          return (
            <li key={i} className={active ? styles.slotActive : styles.slot}>
              <div className={styles.slotHead}>
                <input
                  className={styles.slotName}
                  value={slot.label}
                  onChange={(e) => renameSlot(i, e.target.value)}
                  aria-label={`Nome slot ${i + 1}`}
                />
                <span className={styles.slotBadge}>{statusLabel}</span>
                {active && <span className={styles.slotBadge}>attivo</span>}
              </div>
              {g && g.monthsPlayed > 0 ? (
                <p className={styles.slotMeta}>
                  <strong>{g.company.name}</strong> · {city?.label} · {diff}
                  <br />
                  Mese {g.monthsPlayed + 1} · cassa {formatCash(g.company.cash)}
                  {(g.treasury ?? 0) > 0 ? ` · tesoreria ${formatCash(g.treasury)}` : ""}
                  {(g.subsidiaries ?? []).length > 0
                    ? ` · ${g.subsidiaries.length} partecipate`
                    : ""}
                  <br />
                  Salvato:{" "}
                  {slot.updatedAt
                    ? new Date(slot.updatedAt).toLocaleString("it-IT")
                    : "mai"}
                </p>
              ) : (
                <p className={styles.slotMeta}>
                  Vuoto — scegli lo slot e avvia una nuova partita.
                </p>
              )}
              <div className={styles.slotActions}>
                <button
                  className={styles.primary}
                  type="button"
                  onClick={() => {
                    selectSlot(i);
                    if (running) setScreen("game");
                    else setScreen("setup");
                  }}
                >
                  {running ? "Continua partita" : active ? "Nuova su questo slot" : "Usa questo slot"}
                </button>
                {g && (
                  <button
                    className={styles.secondary}
                    type="button"
                    onClick={() => {
                      if (confirm(`Cancellare «${slot.label}»?`)) clearSlot(i);
                    }}
                  >
                    Cancella
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className={styles.actions}>
        <button className={styles.secondary} onClick={() => setScreen("menu")}>
          Menu
        </button>
      </div>
    </div>
  );
};
