import { MONTHLY_MORA_RATE } from "../config/collection";
import { round2, toMonthIndex, type GameState, type TaxLiability } from "./types";

export const overdueLiabilities = (state: GameState, idx: number): TaxLiability[] =>
  state.liabilities.filter((l) => !l.paid && l.dueIdx <= idx);

export const overdueTotal = (state: GameState, idx: number): number =>
  round2(overdueLiabilities(state, idx).reduce((sum, l) => sum + l.amount, 0));

export const applyMonthlyMora = (state: GameState): void => {
  if (state.collectionCase != null) return;
  const idx = toMonthIndex(state.calendar);
  for (const l of state.liabilities) {
    if (!l.paid && l.dueIdx < idx) {
      l.amount = round2(l.amount * (1 + MONTHLY_MORA_RATE));
    }
  }
};

export const updateMonthsTaxOverdue = (state: GameState): void => {
  const idx = toMonthIndex(state.calendar);
  if (overdueTotal(state, idx) > 0) {
    state.monthsTaxOverdue = (state.monthsTaxOverdue ?? 0) + 1;
  } else {
    state.monthsTaxOverdue = 0;
  }
};
