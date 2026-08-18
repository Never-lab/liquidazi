import { useEffect } from "react";
import { FAMILY_LABEL } from "../sim/worldEvents";
import { useGameStore } from "../store/gameStore";
import styles from "./DemandPopup.module.css";

const COPY = {
  secca: {
    title: "Mercato in secca",
    body: "Poche commesse in vendita questo mese.",
  },
  boom: {
    title: "Picco di domanda",
    body: "Tabellone più pieno — attenzione alla capacità.",
  },
} as const;

export const DemandPopupHost = () => {
  const eventPopup = useGameStore((s) => s.eventPopup);
  const demandPopup = useGameStore((s) => s.demandPopup);
  const pendingEvent = useGameStore((s) => s.game.pendingEvent);
  const dismissEvent = useGameStore((s) => s.dismissEventPopup);
  const dismissDemand = useGameStore((s) => s.dismissDemandPopup);

  const showingEvent = Boolean(eventPopup) && !pendingEvent;
  const showingDemand = !showingEvent && !pendingEvent && (demandPopup === "secca" || demandPopup === "boom");

  useEffect(() => {
    if (!showingEvent && !showingDemand) return;
    const t = setTimeout(() => {
      if (showingEvent) dismissEvent();
      else dismissDemand();
    }, showingEvent ? 4800 : 3500);
    return () => clearTimeout(t);
  }, [showingEvent, showingDemand, dismissEvent, dismissDemand]);

  if (pendingEvent) return null;

  if (eventPopup) {
    const tone = eventPopup.tone === "good" ? styles.boom : styles.secca;
    const kicker = eventPopup.family ? FAMILY_LABEL[eventPopup.family] : "Evento";
    return (
      <button
        type="button"
        className={styles.backdrop}
        onClick={() => dismissEvent()}
        aria-label="Chiudi avviso evento"
      >
        <div className={`${styles.card} ${tone}`} role="status">
          <p className={styles.kicker}>{kicker}</p>
          <strong className={styles.title}>{eventPopup.title}</strong>
          <p className={styles.body}>{eventPopup.body}</p>
        </div>
      </button>
    );
  }

  if (demandPopup !== "secca" && demandPopup !== "boom") return null;
  const copy = COPY[demandPopup];
  return (
    <button
      type="button"
      className={styles.backdrop}
      onClick={() => dismissDemand()}
      aria-label="Chiudi avviso domanda"
    >
      <div className={`${styles.card} ${styles[demandPopup]}`} role="status">
        <strong className={styles.title}>{copy.title}</strong>
        <p className={styles.body}>{copy.body}</p>
      </div>
    </button>
  );
};
