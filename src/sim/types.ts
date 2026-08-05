/**
 * Core simulation types for Liquidazi.
 * Fiscal entities grow phase by phase; all rates come from
 * src/config/fiscalYearSnapshot.ts — never hardcoded here.
 * Region/city market pack lives in src/config/market.ts (+ marketPack.json).
 */

import { cityById, type CityId, type SectorId } from "../config/market";

export type { CityId, SectorId };

export interface Company {
  name: string;
  cash: number;
  city: CityId;
  sector: SectorId;
  /** InfoCamere: imprese attive in provincia nel settore (ATECO mappato) */
  firmsInSector: number;
  /** densità settore vs mediana pack (1 = mediana) */
  densityIndex: number;
  /** monthly locale rent = €/mq annunci × 80 mq sede tipo */
  monthlyRent: number;
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

export type LoanGuarantee = "none" | "fondo_garanzia_pmi" | "fideiussione";

export interface Loan {
  principal: number;
  outstanding: number;
  tenorMonths: number;
  monthsPaid: number;
  rateType: "fixed" | "floating";
  /** total annual rate locked at origination; null for floating */
  fixedAnnualRate: number | null;
  spreadBps: number;
  guarantee: LoanGuarantee;
  lastInstallment: { interest: number; principal: number } | null;
}

export type GameStatus = "running" | "won" | "lost";

/** P&L accumulator for the current fiscal year (competenza). */
export interface YearToDate {
  revenue: number;
  purchases: number;
  payrollCost: number;
  interest: number;
  otherCosts: number;
}

export interface YearReport extends YearToDate {
  year: number;
  profit: number;
  irapBase: number;
  ires: number;
  irap: number;
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
  /** 0-100 reputation with the tax authorities; drops when F24s are skipped */
  compliance: number;
  ytd: YearToDate;
  /** taxes computed at last year close; basis for June/November acconti */
  priorYearTax: { ires: number; irap: number } | null;
  /** acconti already charged (as liabilities) against the current year */
  accontiCharged: { ires: number; irap: number };
  lastYearReport: YearReport | null;
  loan: Loan | null;
  monthsPlayed: number;
  /** consecutive months closed with negative cash */
  monthsBelowZero: number;
  status: GameStatus;
  nextId: number;
}

/** Game-over rule: this many consecutive months with cash < 0 loses. */
export const LOSE_MONTHS_BELOW_ZERO = 3;
/** Win rule: survive this many months with cash >= 0 at the end. */
export const WIN_MONTHS = 24;

/** Absolute month index: comparable across year boundaries. */
export const toMonthIndex = (c: Calendar): number => c.year * 12 + (c.month - 1);

export const round2 = (n: number): number => Math.round(n * 100) / 100;

export interface NewGameOptions {
  name?: string;
  city: CityId;
  sector: SectorId;
}

export const createInitialGameState = (opts?: NewGameOptions): GameState => {
  // Bare createInitialGameState() (tests): Parma/servizi ≈ mediana densità, no rent.
  // Setup UI always passes opts so real rent + InfoCamere density apply.
  const city = opts?.city ?? "parma";
  const sector = opts?.sector ?? "servizi";
  const withMarket = Boolean(opts);
  const spot = cityById(city);
  return {
    company: {
      name: opts?.name?.trim() || "La Mia SRL",
      cash: 10000,
      city,
      sector,
      firmsInSector: withMarket ? spot.firmsBySector[sector] : spot.firmsBySector[sector],
      densityIndex: withMarket ? spot.densityIndex[sector] : 1,
      monthlyRent: withMarket ? spot.monthlyRent : 0,
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
    compliance: 100,
    ytd: { revenue: 0, purchases: 0, payrollCost: 0, interest: 0, otherCosts: 0 },
    priorYearTax: null,
    accontiCharged: { ires: 0, irap: 0 },
    lastYearReport: null,
    loan: null,
    monthsPlayed: 0,
    monthsBelowZero: 0,
    status: "running",
    nextId: 1,
  };
};
