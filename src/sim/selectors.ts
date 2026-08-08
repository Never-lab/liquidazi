import {
  formatMonthIdx,
  round2,
  toMonthIndex,
  type GameState,
  type Invoice,
  type TaxLiability,
} from "./types";
import { f24BlockedByCollection } from "./collection";

/** Liabilities payable right now with the F24 (due this month or overdue). */
export const dueF24Liabilities = (state: GameState): TaxLiability[] => {
  if (f24BlockedByCollection(state)) return [];
  const idx = toMonthIndex(state.calendar);
  const snap =
    state.collectionCase?.stage === "rateazione" && state.collectionCase.liabilityIds?.length
      ? new Set(state.collectionCase.liabilityIds)
      : null;
  return state.liabilities.filter(
    (l) => !l.paid && l.dueIdx <= idx && !(snap?.has(l.id) ?? false),
  );
};

export const dueF24Total = (state: GameState): number =>
  round2(dueF24Liabilities(state).reduce((sum, l) => sum + l.amount, 0));

export type ScheduleRow = {
  invoice: Invoice;
  /** Cash that moves on settlement (AR: net if PA split, else gross; AP: -gross) */
  cashDelta: number;
  closesUntil: number;
  dueLabel: string;
};

/** Open invoices sorted by due date — for the scadenziario UI. */
export const openInvoiceSchedule = (state: GameState): ScheduleRow[] => {
  const now = toMonthIndex(state.calendar);
  return state.invoices
    .filter((i) => !i.settled && !i.defaulted)
    .map((invoice) => {
      const cashDelta =
        invoice.kind === "AR"
          ? invoice.splitPayment
            ? invoice.net
            : invoice.gross
          : -invoice.gross;
      return {
        invoice,
        cashDelta,
        closesUntil: Math.max(0, invoice.dueIdx - now),
        dueLabel: formatMonthIdx(invoice.dueIdx),
      };
    })
    .sort((a, b) => a.invoice.dueIdx - b.invoice.dueIdx || a.invoice.id - b.invoice.id);
};

export const scheduleTotals = (rows: ScheduleRow[]) => {
  let inflow = 0;
  let outflow = 0;
  for (const r of rows) {
    if (r.cashDelta >= 0) inflow = round2(inflow + r.cashDelta);
    else outflow = round2(outflow + r.cashDelta);
  }
  return { inflow, outflow, net: round2(inflow + outflow), count: rows.length };
};

/** Invoices that settle when you press Chiudi mese this month. */
export const thisCloseRows = (rows: ScheduleRow[]): ScheduleRow[] =>
  rows.filter((r) => r.closesUntil === 0);

