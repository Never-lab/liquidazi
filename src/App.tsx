import { DisclaimerFooter } from "./components/DisclaimerFooter";
import { EndScreen } from "./screens/EndScreen";
import { GameHUD } from "./screens/GameHUD";
import { MenuScreen } from "./screens/MenuScreen";
import { SetupScreen } from "./screens/SetupScreen";
import { TutorialScreen } from "./screens/TutorialScreen";
import { useGameStore } from "./store/gameStore";
import styles from "./App.module.css";

function App() {
  const screen = useGameStore((s) => s.screen);

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.brand}>Liquidazi</h1>
      </header>

      <main className={styles.main}>
        {screen === "menu" && <MenuScreen />}
        {screen === "setup" && <SetupScreen />}
        {screen === "tutorial" && <TutorialScreen />}
        {screen === "game" && <GameHUD />}
        {screen === "gameover" && <EndScreen outcome="gameover" />}
        {screen === "win" && <EndScreen outcome="win" />}
      </main>

      <DisclaimerFooter />
    </div>
  );
}

export default App;
