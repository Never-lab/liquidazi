import { useState } from "react";
import { useGameStore } from "../store/gameStore";
import styles from "./MenuScreen.module.css";

export const AuthScreen = () => {
  const login = useGameStore((s) => s.login);
  const register = useGameStore((s) => s.register);
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
    <div className={styles.menu}>
      <h2 className={styles.title}>{mode === "login" ? "Accedi" : "Crea account"}</h2>
      <p className={styles.subtitle}>
        Scegli un username per giocare e comparire in classifica. Serve l&apos;API locale
        (`npm run dev:api`).
      </p>

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
        <button className={styles.primary} disabled={busy} onClick={() => void submit()}>
          {busy ? "Attendi…" : mode === "login" ? "Entra" : "Registrati"}
        </button>
        <button
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
  );
};
