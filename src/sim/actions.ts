import { fiscalYearSnapshot as snap } from "../config/fiscalYearSnapshot";
import { marketModifiers } from "./market";
import {
  round2,
  toMonthIndex,
  type GameState,
  type InvoiceKind,
  type LoanGuarantee,
} from "./types";

const addInvoice = (state: GameState, kind: InvoiceKind, net: number): GameState => {
  const next = structuredClone(state);
  const idx = toMonthIndex(next.calendar);
  const mods = marketModifiers(next.company.rivals);
  const scaledNet = round2(net * (kind === "AR" ? mods.priceFactor : mods.costFactor));
  const vat = round2(scaledNet * snap.iva_standard_rate);
  next.invoices.push({
    id: next.nextId++,
    kind,
    net: scaledNet,
    vat,
    gross: round2(scaledNet + vat),
    issuedIdx: idx,
    dueIdx: idx + 1,
    settled: false,
  });
  return next;
};

/** Emetti fattura cliente (AR): incasso lordo al mese successivo. */
export const issueCustomerInvoice = (state: GameState, net: number): GameState =>
  addInvoice(state, "AR", net);

/** Registra costo fornitore (AP): pagamento lordo al mese successivo. */
export const recordSupplierCost = (state: GameState, net: number): GameState =>
  addInvoice(state, "AP", net);

/** Ruoli assumibili nel MVP (retribuzioni di gioco, non tabelle CCNL). */
export const PRESET_ROLES = [
  { role: "Operaio", grossMonthly: 1800 },
  { role: "Impiegato", grossMonthly: 2200 },
  { role: "Responsabile", grossMonthly: 3000 },
] as const;

export const hireEmployee = (state: GameState, role: string): GameState => {
  const preset = PRESET_ROLES.find((r) => r.role === role);
  if (!preset) return state;
  const next = structuredClone(state);
  next.employees.push({
    id: next.nextId++,
    role: preset.role,
    grossMonthly: preset.grossMonthly,
  });
  return next;
};

export const fireEmployee = (state: GameState, id: number): GameState => {
  const next = structuredClone(state);
  next.employees = next.employees.filter((e) => e.id !== id);
  return next;
};

const spreadForGuarantee = (guarantee: LoanGuarantee): number => {
  if (guarantee === "fondo_garanzia_pmi")
    return snap.loan_base_spread_bps - snap.fondo_garanzia_spread_discount_bps;
  if (guarantee === "fideiussione")
    return snap.loan_base_spread_bps - snap.fideiussione_spread_discount_bps;
  return snap.loan_base_spread_bps;
};

/** Euribor 3M dello scenario al mese di gioco dato (clampato a fine path). */
export const euriborAt = (monthsPlayed: number): number => {
  const path = snap.euribor_3m_path;
  return path[Math.min(monthsPlayed, path.length - 1)];
};

/**
 * La banca approva? Il Fondo di Garanzia PMI alza il tetto di credito e
 * abbassa lo spread — è una garanzia pubblica, NON un contributo a fondo
 * perduto. Un solo prestito attivo nel MVP.
 */
export const canRequestLoan = (
  state: GameState,
  principal: number,
  guarantee: LoanGuarantee,
): boolean => {
  if (state.loan && state.loan.outstanding > 0) return false;
  if (principal <= 0) return false;
  const max =
    guarantee === "fondo_garanzia_pmi"
      ? snap.loan_max_principal_fondo
      : snap.loan_max_principal_base;
  return principal <= max;
};

export interface LoanRequest {
  principal: number;
  tenorMonths: number;
  rateType: "fixed" | "floating";
  guarantee: LoanGuarantee;
}

export const requestLoan = (state: GameState, req: LoanRequest): GameState => {
  if (!canRequestLoan(state, req.principal, req.guarantee)) return state;
  const next = structuredClone(state);
  const spreadBps = spreadForGuarantee(req.guarantee);
  next.loan = {
    principal: req.principal,
    outstanding: req.principal,
    tenorMonths: req.tenorMonths,
    monthsPaid: 0,
    rateType: req.rateType,
    fixedAnnualRate:
      req.rateType === "fixed" ? euriborAt(next.monthsPlayed) + spreadBps / 10000 : null,
    spreadBps,
    guarantee: req.guarantee,
    lastInstallment: null,
  };
  next.company.cash = round2(next.company.cash + req.principal);
  return next;
};

/** Paga in batch tutte le liability F24 dovute (IVA + IRPEF + INPS + IRES/IRAP). */
export const payF24 = (state: GameState): GameState => {
  const next = structuredClone(state);
  const idx = toMonthIndex(next.calendar);
  let total = 0;
  for (const l of next.liabilities) {
    if (!l.paid && l.dueIdx <= idx) {
      l.paid = true;
      total = round2(total + l.amount);
    }
  }
  next.company.cash = round2(next.company.cash - total);
  return next;
};
