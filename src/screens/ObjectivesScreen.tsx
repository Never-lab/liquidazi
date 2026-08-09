import { MILESTONE_DEFS } from "../sim/milestones";
import { useGameStore } from "../store/gameStore";
import styles from "./MenuScreen.module.css";

export const ObjectivesScreen = () => {
  const setScreen = useGameStore((s) => s.setScreen);
  const game = useGameStore((s) => s.game);
  const done = new Set(game.milestones ?? []);

  return (
    <div className={styles.menu}>
      <h2 className={styles.title}>Obiettivi della run</h2>
      <p className={styles.subtitle}>
        Completa la checklist nella partita. I trofei account restano sul profilo se sei
        loggato.
      </p>
      <ul className={styles.objList}>
        {MILESTONE_DEFS.map((m) => {
          const ok = done.has(m.id);
          return (
            <li key={m.id} className={ok ? styles.objDone : styles.objTodo}>
              <span aria-hidden>{ok ? "✓" : "○"}</span>
              <div>
                <strong>{m.label}</strong>
                <p>{m.blurb}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <button type="button" className={styles.secondary} onClick={() => setScreen("game")}>
        Torna al tavolo
      </button>
      <button type="button" className={styles.secondary} onClick={() => setScreen("menu")}>
        Menu
      </button>
    </div>
  );
};
