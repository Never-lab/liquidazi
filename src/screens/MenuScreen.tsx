import { useGameStore } from "../store/gameStore";
import { Button } from "../components/ui/Button";
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
    <div className={styles.shell}>
      <div className={styles.heroBlock}>
        <p className={styles.brandMark}>Liquidazi</p>
        <h2 className={styles.headline}>Tieni in piedi la cassa della tua SRL.</h2>
        <p className={styles.lede}>
          Ciao <strong>{auth?.username ?? "ospite"}</strong> · {slotLabel}. Sopravvivi 24 mesi;
          12 mesi in rosso e sei KO.
        </p>
        <div className={styles.ctaRow}>
          <Button onClick={() => setScreen("setup")}>Nuova partita</Button>
          {canResume && (
            <Button variant="secondary" onClick={() => setScreen("game")}>
              Riprendi
            </Button>
          )}
        </div>
      </div>

      <nav className={styles.secondaryNav} aria-label="Altro">
        <button type="button" className={styles.navLink} onClick={() => setScreen("saves")}>
          Salvataggi
        </button>
        <button type="button" className={styles.navLink} onClick={() => setScreen("leaderboard")}>
          Classifiche
        </button>
        <button type="button" className={styles.navLink} onClick={() => setScreen("tutorial")}>
          Tutorial
        </button>
        {auth ? (
          <button type="button" className={styles.navLink} onClick={logout}>
            Esci ({auth.username})
          </button>
        ) : (
          <button type="button" className={styles.navLink} onClick={() => setScreen("auth")}>
            Accedi per cloud e classifica
          </button>
        )}
      </nav>
    </div>
  );
};
