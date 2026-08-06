import { bugReportUrl, enhancementUrl } from "../config/repo";
import { useGameStore } from "../store/gameStore";
import { Icon } from "../ui/icons";
import styles from "./MenuScreen.module.css";

const openIssue = (url: string) => {
  window.open(url, "_blank", "noopener,noreferrer");
};

export const FeedbackScreen = () => {
  const setScreen = useGameStore((s) => s.setScreen);

  return (
    <div className={styles.menu}>
      <h2 className={styles.title}>Segnala o migliora</h2>
      <p className={styles.subtitle}>
        Apri una issue su GitHub. Serve un account GitHub (gratis). Descrivi cosa è
        successo o cosa vorresti cambiare.
      </p>

      <div className={styles.feedbackCards}>
        <button
          type="button"
          className={styles.feedbackCard}
          onClick={() => openIssue(bugReportUrl())}
        >
          <span className={styles.feedbackIcon} aria-hidden>
            <Icon name="bug" size={24} />
          </span>
          <span className={styles.feedbackBody}>
            <strong>Segnala un bug</strong>
            <span>Crash, dati persi, schermata rotta…</span>
          </span>
          <Icon name="chevron" size={18} className={styles.feedbackChevron} />
        </button>

        <button
          type="button"
          className={styles.feedbackCard}
          onClick={() => openIssue(enhancementUrl())}
        >
          <span className={styles.feedbackIcon} aria-hidden>
            <Icon name="spark" size={24} />
          </span>
          <span className={styles.feedbackBody}>
            <strong>Chiedi una miglioria</strong>
            <span>UX, bilanciamento, nuove funzioni…</span>
          </span>
          <Icon name="chevron" size={18} className={styles.feedbackChevron} />
        </button>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.secondary} onClick={() => setScreen("menu")}>
          <span className={styles.btnInner}>
            <Icon name="chevron" size={18} className={styles.chevronBack} />
            Torna al menu
          </span>
        </button>
      </div>
    </div>
  );
};
