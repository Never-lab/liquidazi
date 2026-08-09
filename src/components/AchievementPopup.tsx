import { milestoneBlurb, milestoneLabel } from "../sim/milestones";
import { useGameStore } from "../store/gameStore";
import styles from "./AchievementPopup.module.css";

export const AchievementPopupHost = () => {
  const id = useGameStore((s) => s.achievementQueue[0] ?? null);
  const auth = useGameStore((s) => s.auth);
  const dismiss = useGameStore((s) => s.dismissAchievementPopup);
  const setScreen = useGameStore((s) => s.setScreen);
  if (!id) return null;

  return (
    <div className={styles.backdrop} role="presentation">
      <div className={styles.card} role="dialog" aria-labelledby="ach-title">
        <p className={styles.kicker}>Obiettivo</p>
        <strong id="ach-title" className={styles.title}>
          {milestoneLabel(id)}
        </strong>
        <p className={styles.body}>{milestoneBlurb(id)}</p>
        {!auth ? (
          <p className={styles.ctaHint}>
            Crea un account per salvare i trofei tra le partite.
          </p>
        ) : null}
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={() => dismiss()}>
            Chiudi
          </button>
          {!auth ? (
            <button
              type="button"
              className={styles.secondary}
              onClick={() => {
                dismiss();
                setScreen("auth");
              }}
            >
              Crea account
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
