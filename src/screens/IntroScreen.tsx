import { useState } from "react";
import { useGameStore } from "../store/gameStore";
import styles from "./MenuScreen.module.css";

const STEPS = [
  {
    title: "1 · Cos'è",
    body: "Gestisci la cassa di una SRL italiana (modello educativo). Obiettivo: non fallire.",
  },
  {
    title: "2 · Come perdi",
    body: "12 mesi di fila in rosso = KO. Non serve «vincere»: serve sopravvivere.",
  },
  {
    title: "3 · Il loop",
    body: "Accetta lavori → chiudi il mese → entrano/escono i soldi (fatture, affitto, stipendi).",
  },
  {
    title: "4 · Il Fisco",
    body: "Il mese dopo arriva l'F24 (IVA/ritenute). Saltarlo costa sanzioni e reputazione.",
  },
  {
    title: "5 · Prossimo click",
    body: "Scegli città e settore, apri l'azienda, fai il primo mese.",
  },
];

export const IntroScreen = () => {
  const skipIntro = useGameStore((s) => s.skipIntro);
  const finishIntro = useGameStore((s) => s.finishIntro);
  const [step, setStep] = useState(0);
  const last = step >= STEPS.length - 1;
  const current = STEPS[step]!;

  return (
    <div className={styles.shell}>
      <p className={styles.brandMark}>Liquidazi</p>
      <h2 className={styles.headline}>Prima di aprire l&apos;azienda</h2>
      <p className={styles.lede}>
        Passo {step + 1} di {STEPS.length}. Puoi saltare quando vuoi.
      </p>

      <div className={styles.menu} style={{ margin: "0 0 16px", maxWidth: "100%" }}>
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
            <button type="button" className={styles.primary} onClick={() => setStep((s) => s + 1)}>
              Capito, avanti
            </button>
          ) : (
            <button type="button" className={styles.primary} onClick={() => finishIntro()}>
              Apri la mia azienda
            </button>
          )}
          {step > 0 && (
            <button type="button" className={styles.secondary} onClick={() => setStep((s) => s - 1)}>
              Indietro
            </button>
          )}
          <button type="button" className={styles.secondary} onClick={() => skipIntro()}>
            Salta
          </button>
        </div>
      </div>
    </div>
  );
};
