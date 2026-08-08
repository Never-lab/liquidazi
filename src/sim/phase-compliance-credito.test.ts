import { describe, expect, it } from "vitest";
import { advanceMonth } from "./advanceMonth";
import {
  canRequestLoan,
  fidoMaxFor,
  FIDO_MAX,
  loanRefusalReason,
  requestLoan,
} from "./actions";
import { createInitialGameState } from "./types";
import { MAX_OPEN_LOANS } from "./loans";

describe("compliance recovery", () => {
  it("+3 per month when in regola from 0", () => {
    let s = createInitialGameState();
    s.quietMode = true;
    s.compliance = 0;
    s.monthsTaxOverdue = 0;
    s.collectionCase = null;
    s.employees = [];
    s = advanceMonth(s);
    expect(s.compliance).toBe(3);
    s = advanceMonth(s);
    expect(s.compliance).toBe(6);
  });

  it("no +3 during cartella", () => {
    let s = createInitialGameState();
    s.quietMode = true;
    s.compliance = 10;
    s.monthsTaxOverdue = 0;
    s.collectionCase = {
      stage: "cartella",
      principal: 500,
      monthsInStage: 0,
      firstOverdueIdx: 0,
      liabilityIds: [],
    };
    s.employees = [];
    s = advanceMonth(s);
    expect(s.compliance).toBe(10);
  });
});

describe("multi-loan + refinance", () => {
  it("allows a second mutuo; refuses a third", () => {
    let s = createInitialGameState();
    s = requestLoan(s, {
      principal: 10000,
      tenorMonths: 12,
      rateType: "fixed",
      guarantee: "none",
    });
    expect(s.loans).toHaveLength(1);
    s = requestLoan(s, {
      principal: 8000,
      tenorMonths: 12,
      rateType: "fixed",
      guarantee: "none",
    });
    expect(s.loans).toHaveLength(MAX_OPEN_LOANS);
    expect(
      loanRefusalReason(s, 5000, "none"),
    ).toMatch(/2 mutui/);
    expect(canRequestLoan(s, 5000, "none")).toBe(false);
  });

  it("refinance closes residual and nets cash", () => {
    let s = createInitialGameState();
    s.company.cash = 5000;
    s = requestLoan(s, {
      principal: 10000,
      tenorMonths: 24,
      rateType: "fixed",
      guarantee: "none",
    });
    const id = s.loans[0]!.id;
    expect(s.company.cash).toBe(15000);
    // Simulate partial paydown
    s.loans[0]!.outstanding = 4000;
    s.loan = s.loans[0]!;
    const cashBefore = s.company.cash;
    s = requestLoan(s, {
      principal: 20000,
      tenorMonths: 36,
      rateType: "fixed",
      guarantee: "fondo_garanzia_pmi",
      refinanceLoanId: id,
    });
    expect(s.loans).toHaveLength(1);
    expect(s.loans[0]!.outstanding).toBe(20000);
    expect(s.company.cash).toBe(cashBefore + 20000 - 4000);
  });
});

describe("fido caps", () => {
  it("compliance ≥70 raises fido with cash", () => {
    const s = createInitialGameState();
    s.compliance = 80;
    s.company.cash = 50_000;
    // min(40k, round(50k*0.5+10k)) = 35k
    expect(fidoMaxFor(s)).toBe(35_000);
    s.company.cash = 80_000;
    expect(fidoMaxFor(s)).toBe(40_000);
  });

  it("low compliance shrinks base fido", () => {
    const s = createInitialGameState();
    s.compliance = 30;
    s.company.cash = 50_000;
    expect(fidoMaxFor(s)).toBe(Math.round(FIDO_MAX * 0.5));
  });
});
