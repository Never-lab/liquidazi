import { Button } from "./ui/Button";
import { useGameStore } from "../store/gameStore";
import styles from "../screens/GameHUD.module.css";

export const EventChoiceBanner = () => {
  const pending = useGameStore((s) => s.game.pendingEvent);
  const resolve = useGameStore((s) => s.resolveEvent);

  if (!pending) return null;

  return (
    <div className={styles.eventChoice} role="dialog" aria-labelledby="event-title">
      <div>
        <p className={styles.eventKicker}>Decisione del mese</p>
        <h3 id="event-title" className={styles.eventTitle}>
          {pending.title}
        </h3>
        <p className={styles.eventBody}>{pending.body}</p>
      </div>
      <div className={styles.rescueActions}>
        {pending.options.map((o) => (
          <Button key={o.id} onClick={() => resolve(o.id)}>
            {o.label}
          </Button>
        ))}
      </div>
    </div>
  );
};
