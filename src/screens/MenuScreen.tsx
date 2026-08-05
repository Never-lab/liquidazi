import { useGameStore } from "../store/gameStore";
import styles from "./MenuScreen.module.css";

export const MenuScreen = () => {
  const setScreen = useGameStore((s) => s.setScreen);
  const logout = useGameStore((s) => s.logout);
  const auth = useGameStore((s) => s.auth);
  const game = useGameStore((s) => s.game);
  const slots = useGameStore((s) => s.slots);
  const activeSlot = useGameStore((s) => s.activeSlot);

  const canResume = game.monthsPlayed > 0 && game.status === "running";
  const slotLabel = slots[activeSlot]?.label ?? `Slot ${activeSlot + 1}`;

  return (
    <div className={styles.menu}>
      <h2 className={styles.title}>Liquidazi</h2>
      <p className={styles.subtitle}>
        Ciao <strong>{auth?.username}</strong> · {slotLabel}. Simulazione aperta: un anno in
        rosso e sei KO.
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
        <button className={styles.secondary} onClick={() => setScreen("saves")}>
          Salvataggi
        </button>
        <button className={styles.secondary} onClick={() => setScreen("leaderboard")}>
          Classifiche
        </button>
        <button className={styles.secondary} onClick={() => setScreen("tutorial")}>
          Tutorial
        </button>
        <button className={styles.secondary} onClick={logout}>
          Esci ({auth?.username})
        </button>
      </div>
    </div>
  );
};
