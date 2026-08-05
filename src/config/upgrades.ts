/** One-shot company upgrades — educational, not a tech tree. */

export type UpgradeId = "gestionale_f24" | "commerciale" | "sede" | "processi";

export interface UpgradeDef {
  id: UpgradeId;
  label: string;
  blurb: string;
  /** flat cash cost; sede uses rent-based cost in buyUpgrade */
  cost: number;
}

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  gestionale_f24: {
    id: "gestionale_f24",
    label: "Gestionale F24",
    blurb: "A chiusura mese, se c'è cassa, versa l'F24 in automatico.",
    cost: 2500,
  },
  commerciale: {
    id: "commerciale",
    label: "Ufficio commerciale",
    blurb: "+1 commessa sul tabellone e ticket un po' più alti.",
    cost: 4500,
  },
  sede: {
    id: "sede",
    label: "Sede / arredi",
    blurb: "Affitto mensile −15%. Costo ≈ 6 mesi di affitto (min 3 000 €).",
    cost: 3000,
  },
  processi: {
    id: "processi",
    label: "Processi interni",
    blurb: "+1 slot capacità senza assumere; cedolino −5% sul costo lordo didattico.",
    cost: 3000,
  },
};

export const UPGRADE_LIST = Object.values(UPGRADES);

export const hasUpgrade = (
  upgrades: UpgradeId[] | undefined,
  id: UpgradeId,
): boolean => (upgrades ?? []).includes(id);
