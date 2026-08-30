import { BRAND_NAME } from "../config/brand";
import { Button } from "../components/ui/Button";
import { useGameStore } from "../store/gameStore";
import { localManagerUrl } from "../ui/localManagerUrl";
import styles from "./LandingScreen.module.css";

export const LandingScreen = () => {
  const setScreen = useGameStore((s) => s.setScreen);
  const lmUrl = localManagerUrl();

  return (
    <div className={styles.root}>
      <div className={styles.atmosphere} aria-hidden />
      <section className={styles.hero}>
        <p className={styles.brand}>{BRAND_NAME}</p>
        <h1 className={styles.headline}>Sim educativi italiani — un account, più scrivanie.</h1>
        <p className={styles.support}>
          Crea un account, poi scegli cosa gestire: una SRL semplificata (Floatdesk) o un comune in early
          access (LocalManager). Modello didattico, non consulenza.
        </p>
        <div className={styles.ctaRow}>
          <Button onClick={() => setScreen("auth")}>Crea account / Accedi</Button>
          <Button variant="secondary" onClick={() => setScreen("auth")}>
            Ho già un account
          </Button>
        </div>
      </section>

      <section className={styles.modes} aria-labelledby="modes-title">
        <h2 id="modes-title" className={styles.sectionTitle}>
          Scegli modalità
        </h2>
        <div className={styles.modeGrid}>
          <article className={styles.modeCard}>
            <h3 className={styles.modeTitle}>Floatdesk</h3>
            <p className={styles.modeBody}>
              Sim SRL: cassa, F24, personale, loop mensile. Giocabile subito con lo stesso account.
            </p>
            <Button onClick={() => setScreen("auth")}>Gioca Floatdesk</Button>
          </article>
          <article className={styles.modeCard}>
            <h3 className={styles.modeTitle}>LocalManager</h3>
            <p className={styles.modeBody}>
              Sim da sindaco: comune, infrastrutture, fondi. Build early — stessa casa Floatdesk, prodotto
              separato.
            </p>
            {lmUrl ? (
              <a className={styles.modeLink} href={lmUrl} target="_blank" rel="noopener noreferrer">
                Apri LocalManager
              </a>
            ) : (
              <p className={styles.modeHint} title="Imposta VITE_LOCALMANAGER_URL al build">
                URL non configurato — chiedi l&apos;indirizzo Railway o riprova dopo il deploy.
              </p>
            )}
          </article>
        </div>
      </section>

      <section className={styles.points}>
        <h2 className={styles.sectionTitle}>Cosa simuli in Floatdesk</h2>
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
        <p className={styles.wikiCue}>
          Approfondimenti crawlable:{" "}
          <a href="/wiki">Guida / Wiki</a> (cassa ≠ utile, F24, personale, finanza, FAQ).
        </p>
      </section>

      <p className={styles.disclaimer}>
        Modello educativo semplificato. Non è consulenza fiscale né software commercialista.
      </p>

      <nav className={styles.links} aria-label="Altro">
        <button type="button" className={styles.linkBtn} onClick={() => setScreen("leaderboard")}>
          Classifiche
        </button>
        <button type="button" className={styles.linkBtn} onClick={() => setScreen("tutorial")}>
          Tutorial
        </button>
        <a className={styles.linkBtn} href="/wiki">
          Guida / Wiki
        </a>
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
