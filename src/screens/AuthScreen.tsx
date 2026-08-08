import { useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import { useGameStore } from "../store/gameStore";
import { Icon } from "../ui/icons";
import styles from "./MenuScreen.module.css";

export const AuthScreen = () => {
  const login = useGameStore((s) => s.login);
  const register = useGameStore((s) => s.register);
  const continueAsGuest = useGameStore((s) => s.continueAsGuest);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [suggestLogin, setSuggestLogin] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (form: HTMLFormElement) => {
    // Autofill often paints the DOM without firing React onChange — read FormData.
    const data = new FormData(form);
    const user = String(data.get("username") ?? username).trim();
    const pass = String(data.get("password") ?? password);
    setUsername(user);
    setPassword(pass);

    setError("");
    setSuggestLogin(false);
    setBusy(true);
    try {
      if (mode === "login") await login(user, pass);
      else await register(user, pass);
    } catch (e) {
      if (mode === "register" && e instanceof ApiError && e.status === 409) {
        setError(
          "Questo username è già registrato. Accedi con la password, oppure scegline un altro.",
        );
        setSuggestLogin(true);
      } else {
        setError(e instanceof Error ? e.message : "Errore");
      }
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void submit(e.currentTarget);
  };

  const switchToLogin = () => {
    setMode("login");
    setError("");
    setSuggestLogin(false);
    setShowPassword(false);
  };

  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setError("");
    setSuggestLogin(false);
    setShowPassword(false);
    setPassword("");
  };

  return (
    <div className={styles.shell}>
      <p className={styles.brandMark}>Liquidazi</p>
      <h2 className={styles.headline}>
        {mode === "login" ? "Accedi allo studio." : "Apri un account."}
      </h2>
      <p className={styles.lede}>
        Puoi giocare subito come ospite. L&apos;account salva le partite sul cloud e
        sblocca la classifica. Ogni username è unico.
      </p>

      <form
        className={styles.menu}
        style={{ margin: "0 0 16px", maxWidth: "100%" }}
        onSubmit={onSubmit}
        autoComplete="on"
      >
        <label className={styles.field}>
          <span>Username</span>
          <input
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            maxLength={20}
            placeholder="es. mario_srl"
          />
        </label>
        <label className={styles.field}>
          <span>Password</span>
          <div className={styles.passwordRow}>
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={8}
              required
            />
            <button
              type="button"
              className={styles.passwordToggle}
              aria-label={showPassword ? "Nascondi password" : "Mostra password"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M3 3l18 18M10.5 10.7a2.5 2.5 0 0 0 3.3 3.3M9.9 5.1A10 10 0 0 1 12 5c5 0 9 4.5 10 7-0.4 1-1.2 2.4-2.4 3.6M6.1 6.1C4.5 7.4 3.4 9 3 12c1 2.5 5 7 9 7 1.4 0 2.7-.3 3.9-.9"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              )}
            </button>
          </div>
        </label>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primary}
            disabled={busy}
            title={busy ? "Attendi il completamento della richiesta…" : "Entra senza registrarti (salvataggi locali)."}
            onClick={() => continueAsGuest()}
          >
            <span className={styles.btnInner}>
              <Icon name="guest" size={18} />
              Continua senza account
            </span>
          </button>
          <button
            type="submit"
            className={styles.secondary}
            disabled={busy}
            title={busy ? "Attendi il completamento della richiesta…" : undefined}
          >
            <span className={styles.btnInner}>
              <Icon name={mode === "login" ? "login" : "user"} size={18} />
              {busy ? "Attendi…" : mode === "login" ? "Entra" : "Registrati"}
            </span>
          </button>
          {suggestLogin && (
            <button
              type="button"
              className={styles.secondary}
              disabled={busy}
              title={busy ? "Attendi il completamento della richiesta…" : "Passa al login con questo username."}
              onClick={switchToLogin}
            >
              <span className={styles.btnInner}>
                <Icon name="login" size={18} />
                Accedi con questo username
              </span>
            </button>
          )}
          <button
            type="button"
            className={styles.secondary}
            disabled={busy}
            title={busy ? "Attendi il completamento della richiesta…" : undefined}
            onClick={switchMode}
          >
            <span className={styles.btnInner}>
              <Icon name="user" size={18} />
              {mode === "login" ? "Non hai un account? Registrati" : "Hai già un account? Accedi"}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};
