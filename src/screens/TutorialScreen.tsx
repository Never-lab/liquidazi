import { useGameStore } from "../store/gameStore";
import styles from "./MenuScreen.module.css";

export const TutorialScreen = () => {
  const setScreen = useGameStore((s) => s.setScreen);

  return (
    <div className={styles.menu}>
      <h2 className={styles.title}>Come funziona l&apos;Italia in questo gioco</h2>
      <ol className={styles.bullets}>
        <li>
          <strong>Cassa ≠ utile.</strong> Le fatture incassano (e pagano) il
          mese dopo l&apos;emissione: puoi essere in utile e restare senza soldi.
        </li>
        <li>
          <strong>L&apos;IVA non è tua.</strong> Ogni mese liquidi IVA vendite −
          IVA acquisti: se è positiva diventa un debito da versare con l&apos;F24
          del mese dopo (giorno 16).
        </li>
        <li>
          <strong>I dipendenti costano più del netto.</strong> Paghi il netto in
          busta, ma accumuli ritenute IRPEF, contributi INPS e TFR da versare.
        </li>
        <li>
          <strong>Giugno e novembre sono i mesi boss.</strong> Saldo IRES/IRAP
          dell&apos;anno prima + acconti (40/60) + diritto camerale: preparati la
          cassa in anticipo.
        </li>
        <li>
          <strong>Il credito ha un prezzo.</strong> Prestito a Euribor + spread;
          il Fondo di Garanzia PMI abbassa lo spread ma il debito resta tuo.
          Sopravvivi 24 mesi con cassa ≥ 0 per vincere; 3 mesi consecutivi in
          rosso e la partita finisce.
        </li>
      </ol>
      <button className={styles.secondary} onClick={() => setScreen("menu")}>
        Torna al menu
      </button>
    </div>
  );
};
