import { BRAND_NAME } from "../config/brand";
import { AdSlot } from "../components/AdSlot";
import { Button } from "../components/ui/Button";
import { useGameStore } from "../store/gameStore";
import styles from "./LandingScreen.module.css";

export const LandingScreen = () => {
  const setScreen = useGameStore((s) => s.setScreen);

  return (
    <div className={styles.root}>
      <div className={styles.atmosphere} aria-hidden />
      <section className={styles.hero}>
        <p className={styles.brand}>{BRAND_NAME}</p>
        <h1 className={styles.headline}>L&apos;unico sim che ti fa sentire l&apos;F24.</h1>
        <p className={styles.support}>
          Gestisci una SRL italiana semplificata: cassa, fatture, personale e adempimenti — modello
          educativo, non un commercialista.
        </p>
        <div className={styles.ctaRow}>
          <Button onClick={() => setScreen("auth")}>Gioca gratis</Button>
          <Button variant="secondary" onClick={() => setScreen("auth")}>
            Ho già un account
          </Button>
        </div>
      </section>

      <section className={styles.points}>
        <h2 className={styles.sectionTitle}>Cosa simuli</h2>
        <ul className={styles.pointList}>
          <li>
            <strong>F24 e cartella</strong> — scadenze, mora, riscossione didattica.
          </li>
          <li>
            <strong>Loop mese</strong> — sopravvivi alla cassa; 12 mesi in rosso = KO.
          </li>
          <li>
            <strong>Italia reale</strong> — comuni ISTAT, affitto e concorrenza locale.
          </li>
        </ul>
      </section>

      <AdSlot placement="landing-mid" />

      <section className={styles.stats} aria-label="Statistiche in arrivo">
        <div className={styles.stat}>
          <span className={styles.statLabel}>Run (periodo)</span>
          <strong className={styles.statValue}>—</strong>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Mesi medi al KO</span>
          <strong className={styles.statValue}>—</strong>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Record sopravvivenza</span>
          <strong className={styles.statValue}>—</strong>
        </div>
      </section>

      <p className={styles.disclaimer}>
        Modello educativo semplificato. Non è consulenza fiscale né software commercialista.
      </p>

      <AdSlot placement="landing-footer" />

      <nav className={styles.links} aria-label="Altro">
        <button type="button" className={styles.linkBtn} onClick={() => setScreen("leaderboard")}>
          Classifiche
        </button>
        <button type="button" className={styles.linkBtn} onClick={() => setScreen("tutorial")}>
          Tutorial
        </button>
        <a className={styles.linkBtn} href="/privacy">
          Privacy
        </a>
        <a className={styles.linkBtn} href="/termini">
          Termini
        </a>
      </nav>
    </div>
  );
};
