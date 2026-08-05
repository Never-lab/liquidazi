import { useState } from "react";
import { useGameStore } from "../store/gameStore";
import styles from "./MenuScreen.module.css";

export const AuthScreen = () => {
  const login = useGameStore((s) => s.login);
  const register = useGameStore((s) => s.register);
  const continueAsGuest = useGameStore((s) => s.continueAsGuest);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      if (mode === "login") await login(username.trim(), password);
      else await register(username.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.shell}>
      <p className={styles.brandMark}>Liquidazi</p>
      <h2 className={styles.headline}>
        {mode === "login" ? "Accedi allo studio." : "Apri un account."}
      </h2>
      <p className={styles.lede}>
        Puoi giocare subito come ospite. L&apos;account serve solo per la classifica (`npm run
        dev:api`).
      </p>

      <div className={styles.menu} style={{ margin: "0 0 16px", maxWidth: "100%" }}>
        <label className={styles.field}>
          <span>Username</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            maxLength={20}
            placeholder="es. mario_srl"
          />
        </label>
        <label className={styles.field}>
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            onKeyDown={(e) => e.key === "Enter" && void submit()}
          />
        </label>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primary}
            disabled={busy}
            onClick={() => continueAsGuest()}
          >
            Continua senza account
          </button>
          <button
            type="button"
            className={styles.secondary}
            disabled={busy}
            onClick={() => void submit()}
          >
            {busy ? "Attendi…" : mode === "login" ? "Entra" : "Registrati"}
          </button>
          <button
            type="button"
            className={styles.secondary}
            disabled={busy}
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
          >
            {mode === "login" ? "Non hai un account? Registrati" : "Hai già un account? Accedi"}
          </button>
        </div>
      </div>
    </div>
  );
};
