import { DisclaimerFooter } from "./components/DisclaimerFooter";
import { GameHUD } from "./screens/GameHUD";
import styles from "./App.module.css";

function App() {
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.brand}>Liquidazi</h1>
      </header>

      <main className={styles.main}>
        <GameHUD />
      </main>

      <DisclaimerFooter />
    </div>
  );
}

export default App;
