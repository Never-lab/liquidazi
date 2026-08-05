/**
 * Core simulation types for Liquidazi.
 * Fiscal entities grow phase by phase; all rates come from
 * src/config/fiscalYearSnapshot.ts — never hardcoded here.
 * Region/city market pack lives in src/config/market.ts (+ marketPack.json).
 */

import {
  DEFAULT_CITY_ID,
  densityIndexFor,
  firmsInSector,
  monthlyRentFor,
  type CityId,
  type SectorId,
} from "../config/market";
import { DIFFICULTIES, type DifficultyId } from "../config/difficulty";

export type { CityId, SectorId, DifficultyId };

export interface Company {
  name: string;
  cash: number;
  city: CityId;
  sector: SectorId;
  /** InfoCamere: imprese attive in provincia nel settore (ATECO mappato) */
  firmsInSector: number;
  /** densità settore vs mediana province (1 = mediana) */
  densityIndex: number;
  /** monthly locale rent = €/mq × 80 mq sede tipo */
  monthlyRent: number;
  /** 0–100 commercial reputation (clients / defaults) */
  reputation: number;
}

export interface Calendar {
  /** 1-12 */
  month: number;
  year: number;
}

export type InvoiceKind = "AR" | "AP";
export type ClientType = "private" | "pa";

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
  /** AR only */
  clientType?: ClientType;
  /** AR only — scissione dei pagamenti (PA paga IVA allo Stato) */
  splitPayment?: boolean;
  /** AR written off as bad debt */
  defaulted?: boolean;
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
  /** month index when hired */
  hireMonthIdx: number;
  /** TFR matured for this person (paid out on fire) */
  tfrAccrued: number;
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

export type GameStatus = "running" | "lost";

/** Banca propone questo in difficoltà (cassa < 0). */
export interface LoanOffer {
  principal: number;
  tenorMonths: number;
  rateType: "fixed" | "floating";
  guarantee: LoanGuarantee;
}

/** Fido di cassa revolving (scoperto accordato). */
export interface Fido {
  limit: number;
  drawn: number;
}

export type OpportunityKind = "sale" | "supply";

/** Monthly market lead — the only way to create invoices (no free typing). */
export interface Opportunity {
  id: number;
  kind: OpportunityKind;
  title: string;
  net: number;
  expiresInMonths: number;
  clientType?: ClientType;
  /** months until cash moves (AR/AP payment term) */
  termMonths: number;
}

export interface LogEntry {
  id: number;
  monthIdx: number;
  tone: "good" | "bad" | "neutral";
  text: string;
}

export interface HistoryPoint {
  monthIdx: number;
  label: string;
  cash: number;
  revenue: number;
  costs: number;
}

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

export interface CareerStats {
  peakCash: number;
  peakDebt: number;
  lifetimeRevenue: number;
  /** run già inviata alla leaderboard */
  submitted: boolean;
}

export interface GameState {
  company: Company;
  calendar: Calendar;
  invoices: Invoice[];
  vat: VatAccount;
  liabilities: TaxLiability[];
  employees: Employee[];
  /** cumulative TFR liability (paid out when firing) */
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
  /** Offerta di salvataggio quando sei in rosso (null se non attiva). */
  loanOffer: LoanOffer | null;
  /** Fido di cassa; può coesistere con un mutuo. */
  fido: Fido | null;
  /** true dopo aver accettato un prestito in difficoltà */
  distressLoanTaken: boolean;
  /** stats di carriera per leaderboard */
  career: CareerStats;
  monthsPlayed: number;
  /** mesi consecutivi chiusi con cassa < 0 */
  monthsBelowZero: number;
  status: GameStatus;
  nextId: number;
  /** current month deal board */
  opportunities: Opportunity[];
  /** recent narrative / event feed */
  log: LogEntry[];
  /** time series for charts */
  history: HistoryPoint[];
  /** when true, skip random world events (unit tests / replay) */
  quietMode: boolean;
  difficulty: DifficultyId;
}

/** Mesi consecutivi in rosso → fallimento (dopo proposta di prestito). */
export const LOSE_MONTHS_BELOW_ZERO = 12;

/** Absolute month index: comparable across year boundaries. */
export const toMonthIndex = (c: Calendar): number => c.year * 12 + (c.month - 1);

export const round2 = (n: number): number => Math.round(n * 100) / 100;

export interface NewGameOptions {
  name?: string;
  city: CityId;
  sector: SectorId;
  difficulty?: DifficultyId;
}

export const createInitialGameState = (opts?: NewGameOptions): GameState => {
  // Bare createInitialGameState() (tests): densità forzata a 1, no rent.
  // Setup UI always passes opts so real rent + InfoCamere density apply.
  const city = opts?.city ?? DEFAULT_CITY_ID;
  const sector = opts?.sector ?? "servizi";
  const withMarket = Boolean(opts);
  const difficulty = opts?.difficulty ?? "normal";
  const diff = DIFFICULTIES[difficulty];
  const rent = withMarket ? Math.round(monthlyRentFor(city) * diff.rentFactor) : 0;
  return {
    company: {
      name: opts?.name?.trim() || "La Mia SRL",
      cash: withMarket ? diff.startingCash : 10000,
      city,
      sector,
      firmsInSector: firmsInSector(city, sector),
      densityIndex: withMarket ? densityIndexFor(city, sector) : 1,
      monthlyRent: rent,
      reputation: 50,
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
    loanOffer: null,
    fido: null,
    distressLoanTaken: false,
    career: {
      peakCash: withMarket ? diff.startingCash : 10000,
      peakDebt: 0,
      lifetimeRevenue: 0,
      submitted: false,
    },
    monthsPlayed: 0,
    monthsBelowZero: 0,
    status: "running",
    nextId: 1,
    opportunities: [],
    log: [
      {
        id: 0,
        monthIdx: 2024 * 12,
        tone: "neutral",
        text: "Azienda aperta. Non inventare fatture: prendi le commesse del mese.",
      },
    ],
    history: [
      {
        monthIdx: 2024 * 12,
        label: "Gen 2024",
        cash: withMarket ? diff.startingCash : 10000,
        revenue: 0,
        costs: 0,
      },
    ],
    quietMode: !withMarket,
    difficulty,
  };
};
