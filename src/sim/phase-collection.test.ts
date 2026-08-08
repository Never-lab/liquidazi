import { describe, expect, it } from "vitest";
import { fiscalYearSnapshot as snap } from "../config/fiscalYearSnapshot";
import { MONTHLY_MORA_RATE } from "../config/collection";
import { advanceMonth } from "./advanceMonth";
import { issueCustomerInvoice, payF24 } from "./actions";
import { createInitialGameState, round2 } from "./types";

describe("fiscal mora", () => {
  it("after one-shot penalty, amount grows each further month", () => {
    let s = createInitialGameState();
    s.quietMode = true;
    s = issueCustomerInvoice(s, 1000);
    s = advanceMonth(s); // due
    s = advanceMonth(s); // one-shot
    const iva = round2(1000 * snap.iva_standard_rate);
    const afterOne = round2(iva * (1 + snap.penalty_late_pct + snap.interest_late_pct));
    expect(s.liabilities.find((l) => l.kind === "IVA")?.amount).toBeCloseTo(afterOne);
    s = advanceMonth(s); // mora
    expect(s.liabilities.find((l) => l.kind === "IVA")?.amount).toBeCloseTo(
      round2(afterOne * (1 + MONTHLY_MORA_RATE)),
    );
    expect(s.monthsTaxOverdue).toBeGreaterThanOrEqual(2);
  });

  it("paying clears monthsTaxOverdue", () => {
    let s = createInitialGameState();
    s.quietMode = true;
    s = issueCustomerInvoice(s, 1000);
    s = advanceMonth(s);
    s = advanceMonth(s);
    expect(s.monthsTaxOverdue).toBeGreaterThan(0);
    s = payF24(s);
    s = advanceMonth(s);
    expect(s.monthsTaxOverdue).toBe(0);
  });
});
