import { useGameStore } from "../store/gameStore";
import styles from "./CloudSavePill.module.css";

const LABEL: Record<string, string> = {
  pending: "In coda…",
  syncing: "Sincronizzo…",
  saved: "Salvato",
};

export const CloudSavePill = () => {
  const auth = useGameStore((s) => s.auth);
  const status = useGameStore((s) => s.cloudSaveStatus);
  if (!auth || status === "hidden") return null;
  return (
    <div className={styles.pill} role="status" aria-live="polite">
      <span className={styles.icon} aria-hidden>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M7 18h10a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.4-1.5A3.5 3.5 0 0 0 7 18z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
      </span>
      <span>{LABEL[status]}</span>
    </div>
  );
};
