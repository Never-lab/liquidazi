import type { GameState } from "./types";

/**
 * Pure simulation step. Phase 1 stub: advances the calendar by one month
 * and wraps December -> January of the next year. No cash flow, no fiscal
 * logic yet — those land in Phase 2+ (IVA, payroll, F24, IRES/IRAP, loans).
 * When mutating company fields later, deep-clone nested objects —
 * this function currently shallow-spreads `state`.
 */
export const advanceMonth = (state: GameState): GameState => {
  const isDecember = state.calendar.month === 12;

  return {
    ...state,
    calendar: {
      month: isDecember ? 1 : state.calendar.month + 1,
      year: isDecember ? state.calendar.year + 1 : state.calendar.year,
    },
  };
};
