import { coachTipFor } from "../ui/coach";
import { firstWinProgress } from "../ui/firstWin";
import { useGameStore } from "../store/gameStore";
import styles from "./CoachBanner.module.css";

export const CoachBanner = () => {
  const game = useGameStore((s) => s.game);
  const coachOn = useGameStore((s) => s.coachOn);
  const dismissCoach = useGameStore((s) => s.dismissCoach);
  if (!coachOn) return null;
  const tip = coachTipFor(game);
  if (!tip) return null;
  const progress = firstWinProgress(game);

  return (
    <aside className={styles.coach} aria-live="polite">
      <div>
        <p className={styles.kicker}>Guida</p>
        {!progress.complete ? (
          <ol className={styles.checklist} aria-label="Primo ciclo">
            {progress.steps.map((step) => (
              <li
                key={step.id}
                className={step.done ? styles.stepDone : styles.stepTodo}
              >
                <span aria-hidden>{step.done ? "✓" : "○"}</span> {step.label}
              </li>
            ))}
          </ol>
        ) : null}
        <h3 className={styles.title}>{tip.title}</h3>
        <p className={styles.body}>{tip.body}</p>
      </div>
      <button
        type="button"
        className={styles.dismiss}
        title="Nasconde i suggerimenti guida per questa partita."
        onClick={dismissCoach}
      >
        Nascondi guide
      </button>
    </aside>
  );
};
