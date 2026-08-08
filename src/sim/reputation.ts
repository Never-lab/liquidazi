/** Commercial reputation (0–100) → market demand / risk levers. */

const clamp = (n: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, n));

/** Extra monthly capacity slots from reputation. */
export const repSlotBonus = (reputation: number): number =>
  clamp(Math.round(reputation / 20), 0, 5);

/** Multiplier on board saleTarget count. */
export const repDemandMult = (reputation: number): number =>
  0.75 + reputation / 200;

/** Multiplier on contract offer probabilities. */
export const repContractMult = (reputation: number): number =>
  clamp(0.55 + reputation / 200, 0.4, 1.1);

/** Multiplier on private AR default chance. */
export const repDefaultMult = (reputation: number): number =>
  1.45 - reputation / 200;
