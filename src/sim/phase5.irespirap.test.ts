import { describe, expect, it } from "vitest";
import { fiscalYearSnapshot as snap } from "../config/fiscalYearSnapshot";
import { advanceMonth } from "./advanceMonth";
import { issueCustomerInvoice, payF24 } from "./actions";
import { createInitialGameState, round2, toMonthIndex, type GameState } from "./types";

/** Gioca n mesi emettendo una vendita fissa a inizio mese. */
const playMonths = (s: GameState, n: number, saleNet = 10000): GameState => {
  for (let i = 0; i < n; i++) {
    s = issueCustomerInvoice(s, saleNet);
    s = advanceMonth(s);
    s = payF24(s); // niente sanzioni, focus su IRES/IRAP
  }
  return s;
};

describe("Phase 5 — IRES/IRAP annuali + diritto camerale", () => {
  it("12 mesi di vendite → chiusura FY crea liability IRES e IRAP con saldo a giugno", () => {
    let s = createInitialGameState();
    const startIdx = toMonthIndex(s.calendar);
    s = playMonths(s, 12);

    const revenue = 12 * 10000;
    const profit = revenue - snap.diritto_camerale_flat;
    const expectedIres = round2(profit * snap.ires_rate);
    const expectedIrap = round2(revenue * snap.irap_rate);

    const ires = s.liabilities.find((l) => l.kind === "IRES");
    const irap = s.liabilities.find((l) => l.kind === "IRAP");
    expect(ires?.amount).toBeCloseTo(expectedIres);
    expect(irap?.amount).toBeCloseTo(expectedIrap);
    // saldo dovuto a giugno dell'anno successivo
    expect(ires?.dueIdx).toBe(startIdx + 17);
    expect(irap?.dueIdx).toBe(startIdx + 17);

    expect(s.lastYearReport?.ires).toBeCloseTo(expectedIres);
    expect(s.lastYearReport?.profit).toBeCloseTo(profit);
    expect(s.priorYearTax?.ires).toBeCloseTo(expectedIres);
  });

  it("giugno: diritto camerale in cassa + saldo e 1° acconto pagabili con F24", () => {
    let s = createInitialGameState();
    s = playMonths(s, 12); // anno 1 chiuso
    s = playMonths(s, 4); // gen-apr anno 2
    // maggio: chiusura senza payF24, così le liability di giugno restano aperte
    s = issueCustomerInvoice(s, 10000);
    s = advanceMonth(s);

    const priorIres = s.priorYearTax!.ires;
    const priorIrap = s.priorYearTax!.irap;
    const acconto1Ires = round2(priorIres * snap.ires_acconto_pct * snap.acconto_split_first);
    const acconto1Irap = round2(priorIrap * snap.ires_acconto_pct * snap.acconto_split_first);

    // ora siamo a giugno: saldo anno 1 + acconto 1 dovuti
    expect(s.calendar.month).toBe(6);
    const dueNow = s.liabilities.filter(
      (l) => !l.paid && l.dueIdx <= toMonthIndex(s.calendar) && (l.kind === "IRES" || l.kind === "IRAP"),
    );
    const totalDue = dueNow.reduce((sum, l) => sum + l.amount, 0);
    expect(totalDue).toBeCloseTo(priorIres + priorIrap + acconto1Ires + acconto1Irap);

    const cashBefore = s.company.cash;
    s = payF24(s);
    expect(cashBefore - s.company.cash).toBeGreaterThanOrEqual(totalDue);

    // diritto camerale esce dalla cassa alla chiusura di giugno
    const cashJune = s.company.cash;
    s = issueCustomerInvoice(s, 10000);
    s = advanceMonth(s);
    const invoiceGross = s.invoices.find((i) => i.settled && i.gross > 12000)!.gross;
    expect(s.company.cash).toBeCloseTo(cashJune + invoiceGross - snap.diritto_camerale_flat);
  });

  it("novembre: 2° acconto dovuto", () => {
    let s = createInitialGameState();
    s = playMonths(s, 12);
    s = playMonths(s, 9); // gen-set anno 2
    // ottobre: chiusura senza payF24 → acconto2 resta aperto a novembre
    s = issueCustomerInvoice(s, 10000);
    s = advanceMonth(s);

    expect(s.calendar.month).toBe(11);
    const acconto2 = round2(
      s.priorYearTax!.ires * snap.ires_acconto_pct * snap.acconto_split_second,
    );
    const dueIres = s.liabilities.filter(
      (l) => !l.paid && l.kind === "IRES" && l.dueIdx <= toMonthIndex(s.calendar),
    );
    expect(dueIres.some((l) => Math.abs(l.amount - acconto2) < 0.01)).toBe(true);
  });

  it("gli acconti riducono il saldo dell'anno successivo", () => {
    let s = createInitialGameState();
    s = playMonths(s, 12); // anno 1
    s = playMonths(s, 12); // anno 2, con acconti pagati a giugno e novembre

    const yr2 = s.lastYearReport!;
    const accontiIres = round2(yr2.ires * snap.ires_acconto_pct);
    const expectedSaldo = round2(yr2.ires - accontiIres);
    // acconto_pct = 1 → saldo ~0: nessuna nuova liability IRES sopra il saldo atteso
    const saldoLiabilities = s.liabilities.filter(
      (l) => l.kind === "IRES" && !l.paid && l.dueIdx > toMonthIndex(s.calendar),
    );
    const total = saldoLiabilities.reduce((sum, l) => sum + l.amount, 0);
    expect(total).toBeCloseTo(Math.max(0, expectedSaldo), 1);
  });

  it("anno in perdita → nessuna IRES", () => {
    let s = createInitialGameState();
    // solo costi, nessuna vendita
    for (let i = 0; i < 12; i++) {
      s = advanceMonth(s);
    }
    expect(s.lastYearReport?.ires).toBe(0);
    expect(s.liabilities.find((l) => l.kind === "IRES")).toBeUndefined();
  });
});
