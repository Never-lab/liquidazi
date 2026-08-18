import { Button } from "./ui/Button";
import { FAMILY_LABEL } from "../sim/worldEvents";
import { useGameStore } from "../store/gameStore";
import styles from "../screens/GameHUD.module.css";

export const EventChoiceBanner = () => {
  const pending = useGameStore((s) => s.game.pendingEvent);
  const resolve = useGameStore((s) => s.resolveEvent);

  if (!pending) return null;

  const kicker = pending.family ? FAMILY_LABEL[pending.family] : "Decisione del mese";

  return (
    <div className={styles.eventChoice} role="dialog" aria-labelledby="event-title">
      <div>
        <p className={styles.eventKicker}>{kicker}</p>
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
