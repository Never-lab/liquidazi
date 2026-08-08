import { useEffect } from "react";
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
  const demandPopup = useGameStore((s) => s.demandPopup);
  const dismiss = useGameStore((s) => s.dismissDemandPopup);

  useEffect(() => {
    if (!demandPopup) return;
    const t = setTimeout(() => dismiss(), 3500);
    return () => clearTimeout(t);
  }, [demandPopup, dismiss]);

  if (demandPopup !== "secca" && demandPopup !== "boom") return null;
  const copy = COPY[demandPopup];
  return (
    <button
      type="button"
      className={styles.backdrop}
      onClick={() => dismiss()}
      aria-label="Chiudi avviso domanda"
    >
      <div className={`${styles.card} ${styles[demandPopup]}`} role="status">
        <strong className={styles.title}>{copy.title}</strong>
        <p className={styles.body}>{copy.body}</p>
      </div>
    </button>
  );
};
