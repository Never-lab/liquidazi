import { RIVALRY, type SectorId, type ZoneId } from "../config/market";

export interface MarketModifiers {
  /** multiplies customer invoice net ( >1 bonus, <1 malus ) */
  priceFactor: number;
  /** multiplies supplier cost net ( >1 more expensive inputs under pressure ) */
  costFactor: number;
  pressureLabel: "bassa" | "media" | "alta";
}

/** Rival count for a zone+sector pair from the educational market pack. */
export const rivalsFor = (zone: ZoneId, sector: SectorId): number =>
  RIVALRY[zone][sector];

/**
 * Competition curve — stepwise, no floating magic rates elsewhere.
 * 0–1 rivals: soft monopoly bonus
 * 2–3: neutral-ish
 * 4–5: crowded
 * 6+: cut-throat
 */
export const marketModifiers = (rivals: number): MarketModifiers => {
  if (rivals <= 1) {
    return { priceFactor: 1.12, costFactor: 0.95, pressureLabel: "bassa" };
  }
  if (rivals <= 3) {
    return { priceFactor: 1.0, costFactor: 1.0, pressureLabel: "media" };
  }
  if (rivals <= 5) {
    return { priceFactor: 0.9, costFactor: 1.05, pressureLabel: "alta" };
  }
  return { priceFactor: 0.8, costFactor: 1.12, pressureLabel: "alta" };
};
