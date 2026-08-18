/** One-shot company upgrades — educational, not a tech tree. */

export type UpgradeId =
  | "gestionale_f24"
  | "commerciale"
  | "sede"
  | "processi"
  | "scorte";

export type UpgradeLevel = 0 | 1 | 2 | 3 | 4;

export type UpgradeLevels = Partial<Record<UpgradeId, UpgradeLevel>>;

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
    blurb: "Affitto mensile −15%. Costo ≈ 6 mesi di affitto (min 3 000 €).",
    cost: 3000,
  },
  processi: {
    id: "processi",
    label: "Processi interni",
    blurb: "+1 slot capacità senza assumere; cedolino −5% sul costo lordo didattico.",
    cost: 3000,
  },
  scorte: {
    id: "scorte",
    label: "Magazzino scorte",
    blurb: "Capienza scorte 8 mesi (base 6).",
    cost: 2800,
  },
};

/** Per-level cost multiplier and UI blurb. Index 0 = Lv1, 1 = Lv2, 2 = Lv3. */
export const UPGRADE_LEVELS: Record<
  UpgradeId,
  { costMult: number; blurb: string }[]
> = {
  gestionale_f24: [
    { costMult: 1.0, blurb: UPGRADES.gestionale_f24.blurb },
    {
      costMult: 1.7,
      blurb: "F24 automatico + bonus compliance (+1) quando paga in automatico.",
    },
    {
      costMult: 2.6,
      blurb: "F24 automatico + bonus compliance (+2) quando paga in automatico.",
    },
  ],
  commerciale: [
    { costMult: 1.0, blurb: UPGRADES.commerciale.blurb },
    {
      costMult: 1.8,
      blurb: "+2 commesse sul tabellone, ticket ×1.12, tetto +6 000 €.",
    },
    {
      costMult: 2.8,
      blurb: "+3 commesse sul tabellone, ticket ×1.16, tetto +8 000 €.",
    },
  ],
  sede: [
    { costMult: 1.0, blurb: UPGRADES.sede.blurb },
    { costMult: 1.8, blurb: "Affitto mensile −22% sul canone base." },
    { costMult: 2.6, blurb: "Affitto mensile −28% sul canone base." },
  ],
  processi: [
    { costMult: 1.0, blurb: UPGRADES.processi.blurb },
    {
      costMult: 1.8,
      blurb: "+2 slot capacità; cedolino −7% sul costo lordo didattico.",
    },
    {
      costMult: 2.6,
      blurb: "+3 slot capacità; cedolino −10% sul costo lordo didattico.",
    },
  ],
  scorte: [
    { costMult: 1.0, blurb: UPGRADES.scorte.blurb },
    { costMult: 1.6, blurb: "Capienza scorte 10 mesi." },
    { costMult: 2.2, blurb: "Capienza scorte 12 mesi." },
    { costMult: 2.8, blurb: "Capienza scorte 14 mesi." },
  ],
};

export const UPGRADE_LIST = Object.values(UPGRADES);

export const SUPPLY_MONTHS_BASE = 6;

export const upgradeMaxLevel = (id: UpgradeId): UpgradeLevel =>
  id === "scorte" ? 4 : 3;

export const upgradeLevel = (
  levels: UpgradeLevels | undefined,
  id: UpgradeId,
): UpgradeLevel => {
  const raw = levels?.[id] ?? 0;
  const n = Math.trunc(Number(raw));
  if (!Number.isFinite(n)) return 0;
  const max = upgradeMaxLevel(id);
  return Math.max(0, Math.min(max, n)) as UpgradeLevel;
};

export const supplyCapMonths = (levels?: UpgradeLevels): number =>
  SUPPLY_MONTHS_BASE + upgradeLevel(levels, "scorte") * 2;

export const hasUpgrade = (
  levelsOrLegacy: UpgradeLevels | UpgradeId[] | undefined,
  id: UpgradeId,
): boolean => {
  if (Array.isArray(levelsOrLegacy)) {
    return levelsOrLegacy.includes(id);
  }
  return upgradeLevel(levelsOrLegacy, id) >= 1;
};

export const nextUpgradeLevel = (
  levels: UpgradeLevels | undefined,
  id: UpgradeId,
): UpgradeLevel | null => {
  const current = upgradeLevel(levels, id);
  const max = upgradeMaxLevel(id);
  if (current >= max) return null;
  return (current + 1) as UpgradeLevel;
};
