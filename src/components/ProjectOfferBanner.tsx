import { getProjectDef } from "../config/projects";
import { useGameStore } from "../store/gameStore";
import { formatCash } from "./formatCash";
import { Button } from "./ui/Button";
import styles from "../screens/GameHUD.module.css";

export const ProjectOfferBanner = () => {
  const offer = useGameStore((s) => s.game.projectOffer);
  const cash = useGameStore((s) => s.game.company.cash);
  const accept = useGameStore((s) => s.acceptProject);
  const skip = useGameStore((s) => s.skipProjectOffer);

  if (!offer) return null;

  return (
    <div className={styles.eventChoice} role="dialog" aria-labelledby="project-offer-title">
      <div className={styles.projectOfferHead}>
        <p className={styles.eventKicker}>Piano investimenti {offer.year}</p>
        <h3 id="project-offer-title" className={styles.eventTitle}>
          Investimento strutturale dell&apos;anno
        </h3>
        <p className={styles.eventBody}>
          Ogni gennaio puoi avviare un progetto (digitalizzazione, magazzino, formazione,
          espansione): costa cassa ora e dà effetti per 6–12 mesi. Ne resta attivo solo uno;
          puoi anche saltare e ripensarci l&apos;anno dopo.
        </p>
      </div>
      <div className={styles.projectOfferGrid}>
        {offer.options.map((id) => {
          const def = getProjectDef(id);
          const totalCost = def.cost + def.frozenCash;
          const canAfford = cash >= totalCost;
          return (
            <article key={id} className={styles.projectOption}>
              <h4 className={styles.projectOptionTitle}>{def.label}</h4>
              <p className={styles.projectOptionMeta}>
                {formatCash(def.cost)}
                {def.frozenCash > 0 ? ` + ${formatCash(def.frozenCash)} vincolati` : ""}
                {" · "}
                {def.durationMonths} mesi
              </p>
              <p className={styles.projectOptionBlurb}>{def.blurb}</p>
              <Button
                disabled={!canAfford}
                title={!canAfford ? "Cassa insufficiente" : undefined}
                onClick={() => accept(id)}
              >
                Avvia
              </Button>
            </article>
          );
        })}
      </div>
      <div className={styles.rescueActions}>
        <Button variant="ghost" onClick={skip}>
          Salta
        </Button>
      </div>
    </div>
  );
};
