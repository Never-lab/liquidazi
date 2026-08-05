/**
 * Core simulation types for Liquidazi.
 * Fiscal entities grow phase by phase; all rates come from
 * src/config/fiscalYearSnapshot.ts — never hardcoded here.
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

export type InvoiceKind = "AR" | "AP";

export interface Invoice {
  id: number;
  kind: InvoiceKind;
  net: number;
  vat: number;
  gross: number;
  /** absolute month index of issue (competenza) */
  issuedIdx: number;
  /** settles when advancing a month with index >= dueIdx */
  dueIdx: number;
  settled: boolean;
}

export interface VatAccount {
  /** IVA credit carried over to next liquidation */
  credit: number;
}

export type LiabilityKind = "IVA" | "IRPEF" | "INPS" | "IRES" | "IRAP";

export interface TaxLiability {
  id: number;
  kind: LiabilityKind;
  amount: number;
  /** month index in which payment is expected (F24 flavor: competence + 1) */
  dueIdx: number;
  paid: boolean;
  penalized: boolean;
}

export interface Employee {
  id: number;
  role: string;
  grossMonthly: number;
}

/** Aggregated monthly payroll result (cedolino semplificato). */
export interface PayrollRun {
  monthIdx: number;
  totalGross: number;
  totalNet: number;
  irpefWithheld: number;
  inpsTotal: number;
  tfrAccrued: number;
}

export interface GameState {
  company: Company;
  calendar: Calendar;
  invoices: Invoice[];
  vat: VatAccount;
  liabilities: TaxLiability[];
  employees: Employee[];
  /** cumulative TFR liability (accrual only in MVP, never paid out) */
  tfrFund: number;
  lastPayroll: PayrollRun | null;
  nextId: number;
}

/** Absolute month index: comparable across year boundaries. */
export const toMonthIndex = (c: Calendar): number => c.year * 12 + (c.month - 1);

export const round2 = (n: number): number => Math.round(n * 100) / 100;

export const createInitialGameState = (): GameState => ({
  company: {
    name: "La Mia SRL",
    cash: 10000,
  },
  calendar: {
    month: 1,
    year: 2024,
  },
  invoices: [],
  vat: { credit: 0 },
  liabilities: [],
  employees: [],
  tfrFund: 0,
  lastPayroll: null,
  nextId: 1,
});
