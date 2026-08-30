import pkg from "../../package.json";
import { CONSENT_SETTINGS_LABEL, openGoogleConsentSettings } from "../ui/googleCmp";
import { ADSENSE_ALLOWED_PLACEMENTS } from "../ui/adsStub";
import styles from "./DisclaimerFooter.module.css";

export const DisclaimerFooter = () => {
  const showAdPrefs = ADSENSE_ALLOWED_PLACEMENTS.length > 0;
  return (
    <footer className={styles.footer}>
      <p className={styles.line}>Modello educativo semplificato — non consulenza fiscale.</p>
      <p className={styles.version}>Versione — Floatdesk {pkg.version}</p>
      <nav className={styles.links} aria-label="Informazioni legali">
        <a href="/privacy">Privacy</a>
        <a href="/termini">Termini</a>
        {showAdPrefs ? (
          <button
            type="button"
            className={styles.cookie}
            onClick={() => openGoogleConsentSettings()}
          >
            {CONSENT_SETTINGS_LABEL}
          </button>
        ) : null}
      </nav>
    </footer>
  );
};
