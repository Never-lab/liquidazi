import { useEffect } from "react";
import { AdsConsentBanner } from "./components/AdsConsentBanner";
import { CloudSavePill } from "./components/CloudSavePill";
import { DisclaimerFooter } from "./components/DisclaimerFooter";
import { PlausibleAnalytics } from "./components/PlausibleAnalytics";
import { ToastHost } from "./components/Toast";
import { DemandPopupHost } from "./components/DemandPopup";
import { AchievementPopupHost } from "./components/AchievementPopup";
import { AuthScreen } from "./screens/AuthScreen";
import { FeedbackScreen } from "./screens/FeedbackScreen";
import { EndScreen } from "./screens/EndScreen";
import { GameHUD } from "./screens/GameHUD";
import { IntroScreen } from "./screens/IntroScreen";
import { LandingScreen } from "./screens/LandingScreen";
import { LeaderboardScreen } from "./screens/LeaderboardScreen";
import { MenuScreen } from "./screens/MenuScreen";
import { ObjectivesScreen } from "./screens/ObjectivesScreen";
import { SavesScreen } from "./screens/SavesScreen";
import { SetupScreen } from "./screens/SetupScreen";
import { TrophiesScreen } from "./screens/TrophiesScreen";
import { TutorialScreen } from "./screens/TutorialScreen";
import { GuideScreen } from "./screens/GuideScreen";
import { BRAND_NAME } from "./config/brand";
import { useGameStore } from "./store/gameStore";
import { SESSION_EXPIRED_TOAST, isIdleExpired, watchSessionIdle } from "./ui/sessionIdle";
import styles from "./App.module.css";

function App() {
  const screen = useGameStore((s) => s.screen);
  const auth = useGameStore((s) => s.auth);
  const inGame = screen === "game";
  const bareShell =
    screen === "landing" ||
    screen === "menu" ||
    screen === "auth" ||
    screen === "gameover" ||
    screen === "intro";

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("opsInstallTester") !== "1") return;
    const { auth: session, installTesterSave } = useGameStore.getState();
    if (session?.admin) installTesterSave();
    q.delete("opsInstallTester");
    const next = q.toString();
    window.history.replaceState({}, "", next ? `/?${next}` : "/");
  }, []);

  useEffect(() => {
    if (!auth) return;
    const expire = () => {
      const s = useGameStore.getState();
      if (!s.auth) return;
      s.flashToast(SESSION_EXPIRED_TOAST, "bad");
      s.logout();
    };
    if (isIdleExpired()) {
      expire();
      return;
    }
    return watchSessionIdle(expire);
  }, [auth]);

  return (
    <div className={styles.app}>
      {!bareShell && (
        <header className={`${styles.header} ${inGame ? styles.headerGame : ""}`}>
          <h1 className={styles.brand}>{BRAND_NAME}</h1>
          <p className={styles.userBadge}>{auth?.username ?? "Ospite"}</p>
        </header>
      )}

      <main className={`${styles.main} ${styles.screenIn}`} key={screen}>
        {screen === "landing" && <LandingScreen />}
        {screen === "auth" && <AuthScreen />}
        {screen === "intro" && <IntroScreen />}
        {screen === "menu" && <MenuScreen />}
        {screen === "setup" && <SetupScreen />}
        {screen === "tutorial" && <TutorialScreen />}
        {screen === "guide" && <GuideScreen />}
        {screen === "objectives" && <ObjectivesScreen />}
        {screen === "trophies" && <TrophiesScreen />}
        {screen === "game" && <GameHUD />}
        {screen === "gameover" && <EndScreen />}
        {screen === "leaderboard" && <LeaderboardScreen />}
        {screen === "saves" && <SavesScreen />}
        {screen === "feedback" && <FeedbackScreen />}
      </main>

      <ToastHost />
      <DemandPopupHost />
      <AchievementPopupHost />
      <CloudSavePill />
      <AdsConsentBanner />
      <PlausibleAnalytics />
      <DisclaimerFooter />
    </div>
  );
}

export default App;
