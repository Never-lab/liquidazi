import type { GameState, Loan } from "./types";

export const MAX_OPEN_LOANS = 2;

/** Ensure `loans[]` is populated from legacy `loan` and ids exist; sync `loan` mirror. */
export const migrateLoansInPlace = (state: GameState): void => {
  state.loans ??= [];
  if (state.loan && state.loan.outstanding > 0 && state.loans.length === 0) {
    const legacy = state.loan;
    state.loans = [
      {
        ...legacy,
        id: typeof legacy.id === "number" && legacy.id > 0 ? legacy.id : state.nextId++,
      },
    ];
  } else if (state.loan && state.loans.length === 1) {
    // Tests/UI may mutate only `loan` — keep the single open mutuo in sync.
    const id =
      typeof state.loan.id === "number" && state.loan.id > 0
        ? state.loan.id
        : state.loans[0]!.id;
    state.loans[0] = { ...state.loan, id };
  }
  for (const l of state.loans) {
    if (!(typeof l.id === "number" && l.id > 0)) l.id = state.nextId++;
  }
  state.loans = state.loans.filter((l) => l.outstanding > 0.005);
  state.loan = state.loans[0] ?? null;
};

export const openLoans = (state: GameState): Loan[] => {
  migrateLoansInPlace(state);
  return state.loans;
};
