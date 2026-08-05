import { round2, toMonthIndex, type GameState } from "./types";

/**
 * Pure simulation step: closes the current month and moves the calendar
 * forward. Order of operations:
 *   1. settle invoices due (cash in/out of the gross amount)
 *   2. liquidate month IVA (output - input - credit) → liability due next
 *      month; cash untouched until the F24 is paid (Phase 4)
 *   3. advance calendar
 */
export const advanceMonth = (state: GameState): GameState => {
  const next = structuredClone(state);
  const idx = toMonthIndex(next.calendar);

  // 1. invoice settlement
  for (const inv of next.invoices) {
    if (!inv.settled && inv.dueIdx <= idx) {
      inv.settled = true;
      next.company.cash = round2(
        next.company.cash + (inv.kind === "AR" ? inv.gross : -inv.gross),
      );
    }
  }

  // 2. IVA liquidation for invoices issued this month (competenza)
  const issuedNow = next.invoices.filter((i) => i.issuedIdx === idx);
  const output = issuedNow
    .filter((i) => i.kind === "AR")
    .reduce((sum, i) => sum + i.vat, 0);
  const input = issuedNow
    .filter((i) => i.kind === "AP")
    .reduce((sum, i) => sum + i.vat, 0);
  const netVat = round2(output - input - next.vat.credit);
  if (netVat > 0) {
    next.liabilities.push({
      id: next.nextId++,
      kind: "IVA",
      amount: netVat,
      dueIdx: idx + 1,
      paid: false,
      penalized: false,
    });
    next.vat.credit = 0;
  } else {
    next.vat.credit = -netVat;
  }

  // 3. calendar
  const isDecember = next.calendar.month === 12;
  next.calendar = {
    month: isDecember ? 1 : next.calendar.month + 1,
    year: isDecember ? next.calendar.year + 1 : next.calendar.year,
  };

  return next;
};
