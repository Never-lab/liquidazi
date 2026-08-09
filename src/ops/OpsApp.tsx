import { useEffect, useState } from "react";
import { fetchMe, type AuthSession } from "../api/client";
import styles from "../screens/MenuScreen.module.css";
import { OpsDashboard } from "./OpsDashboard";
import { readPersistedAuth } from "./readPersistedAuth";

export const OpsApp = () => {
  const [auth, setAuth] = useState<AuthSession | null>(() => readPersistedAuth());
  const [checking, setChecking] = useState(Boolean(auth?.token));
  const [error, setError] = useState("");

  useEffect(() => {
    const session = readPersistedAuth();
    if (!session?.token) {
      setAuth(null);
      setChecking(false);
      return;
    }
    setChecking(true);
    void fetchMe(session.token)
      .then((me) => {
        if (!me.admin) {
          setAuth(null);
          setError("Solo admin");
          return;
        }
        setAuth({
          token: session.token,
          username: me.username,
          admin: true,
        });
        setError("");
      })
      .catch(() => {
        setAuth(null);
        setError("Sessione non valida — accedi dal gioco.");
      })
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className={styles.menuWide}>
        <h2 className={styles.title}>Controllo</h2>
        <p className={styles.subtitle}>Verifica sessione…</p>
      </div>
    );
  }

  if (!auth?.admin) {
    return (
      <div className={styles.menuWide}>
        <h2 className={styles.title}>Controllo</h2>
        <p className={styles.error}>{error || "Accesso negato"}</p>
        <p className={styles.subtitle}>
          Accedi come admin dal gioco, poi apri Controllo dal menu.
        </p>
        <div className={styles.actions}>
          <a className={styles.secondary} href="/">
            Vai al gioco
          </a>
        </div>
      </div>
    );
  }

  return (
    <OpsDashboard
      auth={auth}
      onBackToGame={() => {
        window.location.href = "/";
      }}
      onInstallTester={() => {
        window.location.href = "/?opsInstallTester=1";
      }}
    />
  );
};
