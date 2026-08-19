import pkg from "../../package.json";
import { clearAdsConsent } from "../ui/adsConsent";
import styles from "./DisclaimerFooter.module.css";

export const DisclaimerFooter = () => (
  <footer className={styles.footer}>
    <p className={styles.line}>Modello educativo semplificato — non consulenza fiscale.</p>
    <p className={styles.version}>Versione — Floatdesk {pkg.version}</p>
    <nav className={styles.links} aria-label="Informazioni legali">
      <a href="/privacy">Privacy</a>
      <a href="/termini">Termini</a>
      <button type="button" className={styles.cookie} onClick={() => clearAdsConsent()}>
        Cookie
      </button>
    </nav>
  </footer>
);
