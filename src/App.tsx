import { CloudSavePill } from "./components/CloudSavePill";
import { DisclaimerFooter } from "./components/DisclaimerFooter";
import { ToastHost } from "./components/Toast";
import { AuthScreen } from "./screens/AuthScreen";
import { EndScreen } from "./screens/EndScreen";
import { GameHUD } from "./screens/GameHUD";
import { IntroScreen } from "./screens/IntroScreen";
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
  const inGame = screen === "game";
  const bareShell =
    screen === "menu" || screen === "auth" || screen === "gameover" || screen === "intro";

  return (
    <div className={styles.app}>
      {!bareShell && (
        <header className={`${styles.header} ${inGame ? styles.headerGame : ""}`}>
          <h1 className={styles.brand}>Liquidazi</h1>
          <p className={styles.userBadge}>{auth?.username ?? "Ospite"}</p>
        </header>
      )}

      <main className={`${styles.main} ${styles.screenIn}`} key={screen}>
        {screen === "auth" && <AuthScreen />}
        {screen === "intro" && <IntroScreen />}
        {screen === "menu" && <MenuScreen />}
        {screen === "setup" && <SetupScreen />}
        {screen === "tutorial" && <TutorialScreen />}
        {screen === "game" && <GameHUD />}
        {screen === "gameover" && <EndScreen />}
        {screen === "leaderboard" && <LeaderboardScreen />}
        {screen === "saves" && <SavesScreen />}
      </main>

      <ToastHost />
      <CloudSavePill />
      <DisclaimerFooter />
    </div>
  );
}

export default App;
