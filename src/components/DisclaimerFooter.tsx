import styles from "./DisclaimerFooter.module.css";

export const DisclaimerFooter = () => (
  <footer className={styles.footer}>
    <p className={styles.line}>Modello educativo semplificato — non consulenza fiscale.</p>
    <nav className={styles.links} aria-label="Informazioni legali">
      <a href="/privacy">Privacy</a>
      <a href="/termini">Termini</a>
    </nav>
  </footer>
);
