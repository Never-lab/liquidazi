import { useGameStore } from "../store/gameStore";
import { Button } from "../components/ui/Button";
import { Icon } from "../ui/icons";
import styles from "./MenuScreen.module.css";

const NavItem = ({
  icon,
  label,
  onClick,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  label: string;
  onClick: () => void;
}) => (
  <button type="button" className={styles.navLink} onClick={onClick}>
    <span className={styles.navRow}>
      <Icon name={icon} size={20} />
      <span>{label}</span>
    </span>
  </button>
);

export const MenuScreen = () => {
  const setScreen = useGameStore((s) => s.setScreen);
  const logout = useGameStore((s) => s.logout);
  const auth = useGameStore((s) => s.auth);
  const game = useGameStore((s) => s.game);
  const slots = useGameStore((s) => s.slots);
  const activeSlot = useGameStore((s) => s.activeSlot);
  const selectSlot = useGameStore((s) => s.selectSlot);

  const resumableIndex = slots.findIndex(
    (s) => s.game && s.game.monthsPlayed > 0 && s.game.status === "running",
  );
  const canResume =
    resumableIndex >= 0 ||
    (game.monthsPlayed > 0 && game.status === "running");
  const slotLabel = slots[activeSlot]?.label ?? `Slot ${activeSlot + 1}`;

  const resume = () => {
    if (game.monthsPlayed > 0 && game.status === "running") {
      setScreen("game");
      return;
    }
    if (resumableIndex >= 0) {
      selectSlot(resumableIndex);
      setScreen("game");
    }
  };

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
          <Button onClick={() => setScreen("setup")}>
            <Icon name="play" size={18} />
            Nuova partita
          </Button>
          {canResume && (
            <Button variant="secondary" onClick={resume}>
              <Icon name="resume" size={18} />
              Riprendi
            </Button>
          )}
        </div>
      </div>

      <nav className={styles.secondaryNav} aria-label="Altro">
        <NavItem icon="save" label="Salvataggi" onClick={() => setScreen("saves")} />
        <NavItem icon="trophy" label="Classifiche" onClick={() => setScreen("leaderboard")} />
        {auth && (
          <NavItem icon="trophy" label="Trofei" onClick={() => setScreen("trophies")} />
        )}
        {auth?.admin && (
          <NavItem icon="spark" label="Controllo" onClick={() => setScreen("admin")} />
        )}
        <NavItem icon="book" label="Tutorial" onClick={() => setScreen("tutorial")} />
        <NavItem icon="book" label="Guida" onClick={() => setScreen("guide")} />
        <NavItem icon="feedback" label="Segnala / migliora" onClick={() => setScreen("feedback")} />
        {auth ? (
          <NavItem icon="logout" label={`Esci (${auth.username})`} onClick={logout} />
        ) : (
          <NavItem icon="login" label="Accedi (cloud + classifica)" onClick={() => setScreen("auth")} />
        )}
      </nav>
    </div>
  );
};
