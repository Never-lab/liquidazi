import { useState } from "react";
import { useGameStore } from "../store/gameStore";
import styles from "./MenuScreen.module.css";

const STEPS = [
  {
    title: "1 · Cassa ≠ utile",
    body: "Accetta una commessa dal tabellone. L'incasso arriva ai termini (PA = tardi). Non inventare fatture.",
  },
  {
    title: "2 · Chiudi il mese",
    body: "Premi «Chiudi il mese». Entrano/escono i soldi delle fatture scadute, affitto, stipendi. Guarda il riepilogo Δ cassa.",
  },
  {
    title: "3 · Paga l'F24",
    body: "Il mese dopo compare il banner giallo: versa IVA e ritenute. Saltare costa sanzione e compliance (spread banca).",
  },
];

export const TutorialScreen = () => {
  const setScreen = useGameStore((s) => s.setScreen);
  const [step, setStep] = useState(0);
  const last = step >= STEPS.length - 1;
  const current = STEPS[step]!;

  return (
    <div className={styles.menu}>
      <h2 className={styles.title}>Tutorial</h2>
      <p className={styles.subtitle}>
        Passo {step + 1} di {STEPS.length}. Poi apri un&apos;azienda e prova il loop.
      </p>

      <div className={styles.tutCard}>
        <h3 className={styles.tutStep}>{current.title}</h3>
        <p className={styles.subtitle}>{current.body}</p>
      </div>

      <div className={styles.tutDots}>
        {STEPS.map((_, i) => (
          <span key={i} className={i === step ? styles.tutDotOn : styles.tutDot} />
        ))}
      </div>

      <div className={styles.actions}>
        {!last ? (
          <button className={styles.primary} onClick={() => setStep((s) => s + 1)}>
            Capito, avanti
          </button>
        ) : (
          <button className={styles.primary} onClick={() => setScreen("setup")}>
            Apri la mia azienda
          </button>
        )}
        {step > 0 && (
          <button className={styles.secondary} onClick={() => setStep((s) => s - 1)}>
            Indietro
          </button>
        )}
        <button className={styles.secondary} onClick={() => setScreen("menu")}>
          Torna al menu
        </button>
      </div>
    </div>
  );
};
