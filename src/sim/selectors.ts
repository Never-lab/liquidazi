import { round2, toMonthIndex, type GameState, type TaxLiability } from "./types";

/** Liabilities payable right now with the F24 (due this month or overdue). */
export const dueF24Liabilities = (state: GameState): TaxLiability[] => {
  const idx = toMonthIndex(state.calendar);
  return state.liabilities.filter((l) => !l.paid && l.dueIdx <= idx);
};

export const dueF24Total = (state: GameState): number =>
  round2(dueF24Liabilities(state).reduce((sum, l) => sum + l.amount, 0));
