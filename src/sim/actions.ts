import { fiscalYearSnapshot as snap } from "../config/fiscalYearSnapshot";
import {
  round2,
  toMonthIndex,
  type GameState,
  type InvoiceKind,
} from "./types";

const addInvoice = (state: GameState, kind: InvoiceKind, net: number): GameState => {
  const next = structuredClone(state);
  const idx = toMonthIndex(next.calendar);
  const vat = round2(net * snap.iva_standard_rate);
  next.invoices.push({
    id: next.nextId++,
    kind,
    net,
    vat,
    gross: round2(net + vat),
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
