/** Quality tiers for board forniture — prices and revenue effects from product spec. */

export type SupplyTierId = "low" | "medium" | "good" | "excellent";

export interface SupplyTier {
  id: SupplyTierId;
  label: string;
  qualityMin: number;
  qualityMax: number;
  priceMin: number;
  priceMax: number;
  /** Multiplier on commessa net when stock of this tier is used. */
  revenueMult: number;
  /** Good tier: one sale consumes the whole batch (waste). */
  singleUseBatch?: boolean;
  /** Low tier: chance of defect surcharge on sale (0–1). */
  defectChance?: number;
}

export const SUPPLY_TIERS: SupplyTier[] = [
  {
    id: "low",
    label: "Qualità bassa",
    qualityMin: 30,
    qualityMax: 55,
    priceMin: 1000,
    priceMax: 8000,
    revenueMult: 0.9,
    defectChance: 0.28,
  },
  {
    id: "medium",
    label: "Qualità media",
    qualityMin: 56,
    qualityMax: 75,
    priceMin: 12000,
    priceMax: 20000,
    revenueMult: 1.05,
  },
  {
    id: "good",
    label: "Qualità buona",
    qualityMin: 76,
    qualityMax: 85,
    priceMin: 22000,
    priceMax: 36000,
    revenueMult: 1.1,
    singleUseBatch: true,
  },
  {
    id: "excellent",
    label: "Qualità ottima",
    qualityMin: 86,
    qualityMax: 100,
    priceMin: 45000,
    priceMax: 72000,
    revenueMult: 1.05,
  },
];

/** Uses of excellent stock in rolling window before client expectations rise. */
export const EXCELLENT_ABUSE_THRESHOLD = 3;
export const EXCELLENT_ABUSE_WINDOW_MONTHS = 6;
/** Months high-quality commesse stay more frequent after abuse. */
export const HIGH_QUALITY_EXPECTATION_MONTHS = 4;
/** Min warehouse quality to satisfy a high-quality commessa. */
export const HIGH_QUALITY_DEMAND_MIN = 80;
/** Reputation hit (all layers) when a high-quality commessa is accepted without stock. */
export const REP_PENALTY_UNSATISFIED_HIGH_QUALITY = 3;
/** Chance a sale requires high quality while expectations are active. */
export const HIGH_QUALITY_SALE_CHANCE = 0.32;

export const tierForQuality = (quality: number): SupplyTier => {
  for (const t of SUPPLY_TIERS) {
    if (quality >= t.qualityMin && quality <= t.qualityMax) return t;
  }
  if (quality < SUPPLY_TIERS[0]!.qualityMin) return SUPPLY_TIERS[0]!;
  return SUPPLY_TIERS[SUPPLY_TIERS.length - 1]!;
};

export const tierForPrice = (net: number): SupplyTier => {
  for (let i = SUPPLY_TIERS.length - 1; i >= 0; i--) {
    const t = SUPPLY_TIERS[i]!;
    if (net >= t.priceMin && net <= t.priceMax) return t;
  }
  if (net < SUPPLY_TIERS[0]!.priceMin) return SUPPLY_TIERS[0]!;
  return SUPPLY_TIERS[SUPPLY_TIERS.length - 1]!;
};

export const qualityLabel = (quality: number): string =>
  `${tierForQuality(quality).label} (${Math.round(quality)})`;
