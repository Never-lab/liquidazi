import { useGameStore } from "../store/gameStore";
import styles from "./panels.module.css";

export const EventFeed = () => {
  const log = useGameStore((s) => s.game.log);

  if (log.length === 0) return null;

  return (
    <section className={styles.feed}>
      <h2 className={styles.panelTitle}>Cosa succede</h2>
      <ul className={styles.feedList}>
        {log.slice(0, 5).map((e) => (
          <li key={e.id} data-tone={e.tone}>
            {e.text}
          </li>
        ))}
      </ul>
    </section>
  );
};
