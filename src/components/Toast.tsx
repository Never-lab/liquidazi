import { useGameStore } from "../store/gameStore";
import styles from "./Toast.module.css";

export const ToastHost = () => {
  const toast = useGameStore((s) => s.toast);
  if (!toast) return null;
  return (
    <div className={`${styles.toast} ${styles[toast.tone]}`} role="status">
      {toast.text}
    </div>
  );
};
