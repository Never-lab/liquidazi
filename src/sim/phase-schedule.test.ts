import { describe, expect, it } from "vitest";
import { issueCustomerInvoice } from "./actions";
import { openInvoiceSchedule, scheduleTotals, thisCloseRows } from "./selectors";
import { createInitialGameState, toMonthIndex } from "./types";

describe("scadenziario", () => {
  it("elenca AR aperte con mese di scadenza", () => {
    let s = createInitialGameState();
    s = issueCustomerInvoice(s, 1000, { clientType: "pa", termMonths: 4 });
    const rows = openInvoiceSchedule(s);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.closesUntil).toBe(4);
    expect(rows[0]!.invoice.dueIdx).toBe(toMonthIndex(s.calendar) + 4);
    expect(rows[0]!.cashDelta).toBe(rows[0]!.invoice.net); // PA split
  });

  it("questa chiusura somma solo le scadute ora", () => {
    let s = createInitialGameState();
    const idx = toMonthIndex(s.calendar);
    s = issueCustomerInvoice(s, 1000, { clientType: "private", termMonths: 1 });
    s.invoices.push({
      id: 99,
      kind: "AR",
      net: 500,
      vat: 110,
      gross: 610,
      issuedIdx: idx - 2,
      dueIdx: idx,
      settled: false,
      clientType: "private",
    });
    const rows = openInvoiceSchedule(s);
    const closing = thisCloseRows(rows);
    expect(closing.every((r) => r.closesUntil === 0)).toBe(true);
    expect(scheduleTotals(closing).count).toBe(1);
    expect(scheduleTotals(closing).inflow).toBe(610);
  });
});
