import { describe, expect, it } from "vitest";
import { fiscalYearSnapshot as snap } from "../config/fiscalYearSnapshot";
import { advanceMonth } from "./advanceMonth";
import { issueCustomerInvoice, payF24 } from "./actions";
import { dueF24Total } from "./selectors";
import { createInitialGameState, round2 } from "./types";

describe("Phase 4 — F24 e sanzioni soft", () => {
  it("pagare l'F24 azzera le liability dovute e scala la cassa", () => {
    let s = createInitialGameState();
    s = issueCustomerInvoice(s, 1000);
    s = advanceMonth(s); // IVA 220 dovuta questo mese

    const iva = round2(1000 * snap.iva_standard_rate);
    expect(dueF24Total(s)).toBeCloseTo(iva);

    const cashBefore = s.company.cash;
    s = payF24(s);

    expect(s.company.cash).toBeCloseTo(cashBefore - iva);
    expect(s.liabilities.every((l) => l.paid)).toBe(true);
    expect(dueF24Total(s)).toBe(0);
  });

  it("saltare l'F24 → sanzione + interessi + malus compliance al mese dopo", () => {
    let s = createInitialGameState();
    s = issueCustomerInvoice(s, 1000);
    s = advanceMonth(s); // IVA dovuta ora
    s = advanceMonth(s); // saltata → sanzione

    const iva = round2(1000 * snap.iva_standard_rate);
    const expected = round2(iva * (1 + snap.penalty_late_pct + snap.interest_late_pct));
    const liability = s.liabilities.find((l) => l.kind === "IVA");

    expect(liability?.penalized).toBe(true);
    expect(liability?.amount).toBeCloseTo(expected);
    expect(s.compliance).toBe(100 - snap.compliance_malus_late);
  });

  it("la sanzione viene applicata una volta sola", () => {
    let s = createInitialGameState();
    s = issueCustomerInvoice(s, 1000);
    s = advanceMonth(s);
    s = advanceMonth(s);
    const amountAfterOnePenalty = s.liabilities.find((l) => l.kind === "IVA")?.amount;
    s = advanceMonth(s);
    expect(s.liabilities.find((l) => l.kind === "IVA")?.amount).toBe(amountAfterOnePenalty);
    expect(s.compliance).toBe(100 - snap.compliance_malus_late);
  });

  it("payF24 non paga liability con scadenza futura", () => {
    let s = createInitialGameState();
    s = issueCustomerInvoice(s, 1000);
    // liability nasce con l'advance e scade il mese dopo; prima non c'è nulla da pagare
    const cash0 = s.company.cash;
    s = payF24(s);
    expect(s.company.cash).toBe(cash0);
  });
});
