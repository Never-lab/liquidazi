import { useGameStore } from "../store/gameStore";
import styles from "./MenuScreen.module.css";

export const MenuScreen = () => {
  const setScreen = useGameStore((s) => s.setScreen);
  const game = useGameStore((s) => s.game);

  const canResume = game.monthsPlayed > 0 && game.status === "running";

  return (
    <div className={styles.menu}>
      <h2 className={styles.title}>Liquidazi</h2>
      <p className={styles.subtitle}>
        Gestisci una SRL italiana per 24 mesi senza finire a secco di cassa.
      </p>
      <div className={styles.actions}>
        <button className={styles.primary} onClick={() => setScreen("setup")}>
          Nuova partita
        </button>
        {canResume && (
          <button className={styles.secondary} onClick={() => setScreen("game")}>
            Riprendi partita
          </button>
        )}
        <button className={styles.secondary} onClick={() => setScreen("tutorial")}>
          Tutorial
        </button>
      </div>
    </div>
  );
};
