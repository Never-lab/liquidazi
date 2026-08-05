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
