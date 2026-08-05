import { useGameStore } from "../store/gameStore";
import { formatCash } from "../components/formatCash";
import styles from "./MenuScreen.module.css";

export const EndScreen = ({ outcome }: { outcome: "gameover" | "win" }) => {
  const game = useGameStore((s) => s.game);
  const setScreen = useGameStore((s) => s.setScreen);

  return (
    <div className={styles.menu}>
      <h2 className={styles.title}>
        {outcome === "win" ? "Ce l'hai fatta!" : "Liquidità esaurita"}
      </h2>
      <p className={styles.outcome}>
        {outcome === "win"
          ? `Hai tenuto in vita la SRL per ${game.monthsPlayed} mesi con ${formatCash(game.company.cash)} in cassa.`
          : `Tre mesi consecutivi in rosso: la banca ha chiuso i rubinetti dopo ${game.monthsPlayed} mesi.`}
      </p>
      <div className={styles.actions}>
        <button className={styles.primary} onClick={() => setScreen("setup")}>
          Nuova partita
        </button>
        <button className={styles.secondary} onClick={() => setScreen("menu")}>Menu</button>
      </div>
    </div>
  );
};
