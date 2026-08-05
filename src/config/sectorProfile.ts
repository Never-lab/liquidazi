import type { SectorId } from "./market";

/** Sector gameplay profile — educational, not ISTAT microdata. */
export interface SectorProfile {
  id: SectorId;
  /** typical private ticket before growth modifiers */
  baseTicket: number;
  /** share of board that are sales vs supply (0–1) */
  saleChance: number;
  /** chance a sale lead is Pubblica Amministrazione */
  paChance: number;
  /** payment term months for private clients (weighted picks) */
  privateTerms: number[];
  /** payment term months for PA */
  paTerms: number[];
  /** chance private AR becomes insoluto at due date */
  defaultChance: number;
  /** seasonality multiplier by calendar month 1–12 */
  seasonality: number[];
}

export const SECTOR_PROFILES: Record<SectorId, SectorProfile> = {
  commercio: {
    id: "commercio",
    baseTicket: 1200,
    saleChance: 0.7,
    paChance: 0.08,
    privateTerms: [1, 1, 1, 2],
    paTerms: [3, 4, 6],
    defaultChance: 0.06,
    seasonality: [0.85, 0.9, 1, 1, 1.05, 1, 0.9, 0.85, 1.05, 1.1, 1.2, 1.35],
  },
  servizi: {
    id: "servizi",
    baseTicket: 1600,
    saleChance: 0.75,
    paChance: 0.22,
    privateTerms: [1, 1, 2, 2],
    paTerms: [3, 4, 6, 6],
    defaultChance: 0.05,
    seasonality: [0.95, 1, 1.05, 1.05, 1, 0.95, 0.85, 0.8, 1.1, 1.1, 1.05, 0.9],
  },
  artigianato: {
    id: "artigianato",
    baseTicket: 1800,
    saleChance: 0.6,
    paChance: 0.12,
    privateTerms: [1, 2, 2, 3],
    paTerms: [3, 4, 6],
    defaultChance: 0.07,
    seasonality: [0.9, 1, 1.05, 1.1, 1.1, 1.05, 0.95, 0.85, 1.05, 1.1, 1.05, 0.95],
  },
  ristorazione: {
    id: "ristorazione",
    baseTicket: 700,
    saleChance: 0.8,
    paChance: 0.03,
    privateTerms: [1, 1, 1, 1],
    paTerms: [2, 3],
    defaultChance: 0.04,
    seasonality: [0.75, 0.8, 0.9, 1, 1.05, 1.15, 1.25, 1.2, 1.1, 1, 0.9, 1.3],
  },
};
