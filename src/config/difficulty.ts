export type DifficultyId = "easy" | "normal" | "hard";

export interface DifficultyProfile {
  id: DifficultyId;
  label: string;
  blurb: string;
  startingCash: number;
  rentFactor: number;
  /** multiplies sector defaultChance */
  defaultMult: number;
  /** multiplies deal ticket cap */
  ticketMult: number;
  /** applyRandomEvent: skip if rng() > this (higher = fewer events) */
  eventSkipAbove: number;
}

export const DIFFICULTIES: Record<DifficultyId, DifficultyProfile> = {
  easy: {
    id: "easy",
    label: "Facile",
    blurb: "Più cassa, affitti soft, meno insoluti e imprevisti.",
    startingCash: 15000,
    rentFactor: 0.85,
    defaultMult: 0.4,
    ticketMult: 1.12,
    eventSkipAbove: 0.72,
  },
  normal: {
    id: "normal",
    label: "Normale",
    blurb: "Bilanciato: il default educativo.",
    startingCash: 10000,
    rentFactor: 1,
    defaultMult: 1,
    ticketMult: 1,
    eventSkipAbove: 0.55,
  },
  hard: {
    id: "hard",
    label: "Difficile",
    blurb: "Cassa stretta, affitti alti, insoluti e caos frequenti.",
    startingCash: 6500,
    rentFactor: 1.2,
    defaultMult: 1.7,
    ticketMult: 0.9,
    eventSkipAbove: 0.35,
  },
};

export const DIFFICULTY_LIST = Object.values(DIFFICULTIES);
