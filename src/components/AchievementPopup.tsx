import { useEffect } from "react";
import { milestoneBlurb, milestoneLabel } from "../sim/milestones";
import { useGameStore } from "../store/gameStore";
import { sfxTrophy } from "../ui/sfx";
import styles from "./AchievementPopup.module.css";

const AUTO_MS = 4200;

export const AchievementPopupHost = () => {
  const id = useGameStore((s) => s.achievementQueue[0] ?? null);
  const auth = useGameStore((s) => s.auth);
  const dismiss = useGameStore((s) => s.dismissAchievementPopup);
  const setScreen = useGameStore((s) => s.setScreen);

  useEffect(() => {
    if (!id) return;
    sfxTrophy();
    const t = setTimeout(dismiss, AUTO_MS);
    return () => clearTimeout(t);
  }, [id, dismiss]);

  if (!id) return null;

  return (
    <div
      className={styles.toast}
      role="status"
      aria-live="polite"
      onClick={() => dismiss()}
    >
      <p className={styles.kicker}>Obiettivo sbloccato</p>
      <strong className={styles.title}>{milestoneLabel(id)}</strong>
      <p className={styles.body}>{milestoneBlurb(id)}</p>
      {!auth ? (
        <button
          type="button"
          className={styles.cta}
          onClick={(e) => {
            e.stopPropagation();
            dismiss();
            setScreen("auth");
          }}
        >
          Crea account per salvare i trofei
        </button>
      ) : null}
    </div>
  );
};
