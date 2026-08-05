import { DisclaimerFooter } from "./components/DisclaimerFooter";
import { ToastHost } from "./components/Toast";
import { AuthScreen } from "./screens/AuthScreen";
import { EndScreen } from "./screens/EndScreen";
import { GameHUD } from "./screens/GameHUD";
import { LeaderboardScreen } from "./screens/LeaderboardScreen";
import { MenuScreen } from "./screens/MenuScreen";
import { SavesScreen } from "./screens/SavesScreen";
import { SetupScreen } from "./screens/SetupScreen";
import { TutorialScreen } from "./screens/TutorialScreen";
import { useGameStore } from "./store/gameStore";
import styles from "./App.module.css";

function App() {
  const screen = useGameStore((s) => s.screen);
  const auth = useGameStore((s) => s.auth);

  const gated = !auth || screen === "auth";

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.brand}>Liquidazi</h1>
        {auth && screen !== "auth" && (
          <p className={styles.userBadge}>{auth.username}</p>
        )}
      </header>

      <main className={`${styles.main} ${styles.screenIn}`} key={gated ? "auth" : screen}>
        {gated && <AuthScreen />}
        {!gated && screen === "menu" && <MenuScreen />}
        {!gated && screen === "setup" && <SetupScreen />}
        {!gated && screen === "tutorial" && <TutorialScreen />}
        {!gated && screen === "game" && <GameHUD />}
        {!gated && screen === "gameover" && <EndScreen />}
        {!gated && screen === "leaderboard" && <LeaderboardScreen />}
        {!gated && screen === "saves" && <SavesScreen />}
      </main>

      <ToastHost />
      <DisclaimerFooter />
    </div>
  );
}

export default App;
