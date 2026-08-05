import { describe, expect, it } from "vitest";
import { fiscalYearSnapshot as snap } from "../config/fiscalYearSnapshot";
import { advanceMonth } from "./advanceMonth";
import { issueCustomerInvoice, recordSupplierCost } from "./actions";
import { createInitialGameState, toMonthIndex } from "./types";

describe("Phase 2 — fatture e liquidazione IVA", () => {
  it("mese con sola vendita → nasce una liability IVA dovuta il mese dopo", () => {
    let s = createInitialGameState();
    const idx = toMonthIndex(s.calendar);
    s = issueCustomerInvoice(s, 1000);

    expect(s.invoices).toHaveLength(1);
    expect(s.invoices[0].gross).toBeCloseTo(1000 * (1 + snap.iva_standard_rate));

    s = advanceMonth(s);

    const iva = s.liabilities.filter((l) => l.kind === "IVA");
    expect(iva).toHaveLength(1);
    expect(iva[0].amount).toBeCloseTo(1000 * snap.iva_standard_rate);
    expect(iva[0].dueIdx).toBe(idx + 1);
    expect(iva[0].paid).toBe(false);
  });

  it("acquisti > vendite → credito IVA a riporto, nessuna liability", () => {
    let s = createInitialGameState();
    s = issueCustomerInvoice(s, 500);
    s = recordSupplierCost(s, 800);
    s = advanceMonth(s);

    expect(s.liabilities.filter((l) => l.kind === "IVA")).toHaveLength(0);
    expect(s.vat.credit).toBeCloseTo(300 * snap.iva_standard_rate);
  });

  it("il credito IVA riduce la liquidazione del mese successivo", () => {
    let s = createInitialGameState();
    s = recordSupplierCost(s, 1000);
    s = advanceMonth(s); // credito 220
    s = issueCustomerInvoice(s, 2000);
    s = advanceMonth(s); // output 440 - credito 220 = 220

    const iva = s.liabilities.filter((l) => l.kind === "IVA");
    expect(iva).toHaveLength(1);
    expect(iva[0].amount).toBeCloseTo(1000 * snap.iva_standard_rate);
    expect(s.vat.credit).toBe(0);
  });

  it("la liquidazione IVA non tocca la cassa; l'incasso fattura arriva al mese di scadenza", () => {
    let s = createInitialGameState();
    const cash0 = s.company.cash;
    s = issueCustomerInvoice(s, 1000);
    s = advanceMonth(s);
    // fattura emessa ma non ancora incassata, IVA liquidata senza cash out
    expect(s.company.cash).toBe(cash0);

    s = advanceMonth(s);
    // scadenza raggiunta → incasso del lordo
    expect(s.company.cash).toBeCloseTo(cash0 + 1000 * (1 + snap.iva_standard_rate));
    expect(s.invoices[0].settled).toBe(true);
  });

  it("costo fornitore → cash out del lordo alla scadenza", () => {
    let s = createInitialGameState();
    const cash0 = s.company.cash;
    s = recordSupplierCost(s, 400);
    s = advanceMonth(s);
    s = advanceMonth(s);
    expect(s.company.cash).toBeCloseTo(cash0 - 400 * (1 + snap.iva_standard_rate));
  });

  it("PA split payment: incassi solo il netto, IVA non in liability output", () => {
    let s = createInitialGameState();
    const cash0 = s.company.cash;
    s = issueCustomerInvoice(s, 1000, { clientType: "pa", termMonths: 1 });
    expect(s.invoices[0].splitPayment).toBe(true);
    s = advanceMonth(s);
    expect(s.liabilities.filter((l) => l.kind === "IVA")).toHaveLength(0);
    s = advanceMonth(s);
    expect(s.company.cash).toBeCloseTo(cash0 + 1000);
    expect(s.invoices[0].settled).toBe(true);
  });

  it("advanceMonth non muta lo stato di partenza (deep clone)", () => {
    const s = issueCustomerInvoice(createInitialGameState(), 1000);
    const frozen = JSON.stringify(s);
    advanceMonth(s);
    expect(JSON.stringify(s)).toBe(frozen);
  });
});
