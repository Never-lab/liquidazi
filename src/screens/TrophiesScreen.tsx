import { MILESTONE_DEFS, platinumProgress } from "../sim/milestones";
import { useGameStore } from "../store/gameStore";
import styles from "./MenuScreen.module.css";

export const TrophiesScreen = () => {
  const setScreen = useGameStore((s) => s.setScreen);
  const auth = useGameStore((s) => s.auth);
  const accountAchievements = useGameStore((s) => s.accountAchievements);
  const done = new Set(accountAchievements);
  const prog = platinumProgress(accountAchievements);

  if (!auth) {
    return (
      <div className={styles.menu}>
        <h2 className={styles.title}>Trofei</h2>
        <p className={styles.subtitle}>
          Accedi o crea un account per salvare i trofei tra le partite.
        </p>
        <button type="button" className={styles.primary} onClick={() => setScreen("auth")}>
          Accedi
        </button>
        <button type="button" className={styles.secondary} onClick={() => setScreen("menu")}>
          Menu
        </button>
      </div>
    );
  }

  return (
    <div className={styles.menu}>
      <h2 className={styles.title}>Trofei</h2>
      <p className={styles.subtitle}>
        Platino {prog.pct}% · {prog.done}/{prog.total} sbloccati
      </p>
      <ul className={styles.objList}>
        {MILESTONE_DEFS.map((m) => {
          const ok = done.has(m.id);
          return (
            <li key={m.id} className={ok ? styles.objDone : styles.objLocked}>
              <span aria-hidden>{ok ? "✓" : "◇"}</span>
              <div>
                <strong>{ok ? m.label : "???"}</strong>
                <p>{ok ? m.blurb : "Ancora bloccato"}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <button type="button" className={styles.secondary} onClick={() => setScreen("menu")}>
        Menu
      </button>
    </div>
  );
};
