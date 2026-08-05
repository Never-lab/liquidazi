/**
 * Core simulation types for Liquidazi.
 * Phase 1: only what the shell UI needs (company + calendar).
 * Fiscal entities (Invoice, VatAccount, TaxLiability, Loan, ...) land in later phases.
 */

export interface Company {
  name: string;
  cash: number;
}

export interface Calendar {
  /** 1-12 */
  month: number;
  year: number;
}

export interface GameState {
  company: Company;
  calendar: Calendar;
}

export const createInitialGameState = (): GameState => ({
  company: {
    name: "La Mia SRL",
    cash: 10000,
  },
  calendar: {
    month: 1,
    year: 2024,
  },
});
