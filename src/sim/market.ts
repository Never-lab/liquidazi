import { densityIndexFor, firmsInSector, type CityId, type SectorId } from "../config/market";

export interface MarketModifiers {
  /** multiplies customer invoice net ( >1 bonus, <1 malus ) */
  priceFactor: number;
  /** multiplies supplier cost net ( >1 more expensive inputs under pressure ) */
  costFactor: number;
  pressureLabel: "bassa" | "media" | "alta" | "molto alta";
  densityIndex: number;
  firmsInSector: number;
}

/**
 * Map InfoCamere density index (city vs pack median) onto price/cost factors.
 * Index 1.0 = mediana del pack; above = more crowded sector locally.
 */
export const marketModifiersFromIndex = (
  densityIndex: number,
): Pick<MarketModifiers, "priceFactor" | "costFactor" | "pressureLabel"> => {
  if (densityIndex < 0.75) {
    return { priceFactor: 1.1, costFactor: 0.96, pressureLabel: "bassa" };
  }
  if (densityIndex < 1.15) {
    return { priceFactor: 1.0, costFactor: 1.0, pressureLabel: "media" };
  }
  if (densityIndex < 1.6) {
    return { priceFactor: 0.92, costFactor: 1.04, pressureLabel: "alta" };
  }
  return { priceFactor: 0.82, costFactor: 1.1, pressureLabel: "molto alta" };
};

export const marketModifiersFor = (cityId: CityId, sector: SectorId): MarketModifiers => {
  const densityIndex = densityIndexFor(cityId, sector);
  return {
    ...marketModifiersFromIndex(densityIndex),
    densityIndex,
    firmsInSector: firmsInSector(cityId, sector),
  };
};
