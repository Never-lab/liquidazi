import { Button } from "./ui/Button";
import { FAMILY_LABEL } from "../sim/worldEvents";
import { useGameStore } from "../store/gameStore";
import demand from "./DemandPopup.module.css";
import styles from "../screens/GameHUD.module.css";

export const EventChoiceBanner = () => {
  const pending = useGameStore((s) => s.game.pendingEvent);
  const resolve = useGameStore((s) => s.resolveEvent);

  if (!pending) return null;

  const kicker = pending.family ? FAMILY_LABEL[pending.family] : "Decisione del mese";

  return (
    <div className={`${demand.backdrop} ${demand.backdropStatic} ${demand.choiceLayer}`} role="presentation">
      <div className={`${demand.card} ${demand.cardInteractive} ${demand.secca}`} role="dialog" aria-labelledby="event-title">
        <p className={demand.kicker}>{kicker}</p>
        <h3 id="event-title" className={demand.title}>
          {pending.title}
        </h3>
        <p className={demand.body}>{pending.body}</p>
        <div className={styles.rescueActions}>
          {pending.options.map((o) => (
            <Button key={o.id} onClick={() => resolve(o.id)}>
              {o.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};
