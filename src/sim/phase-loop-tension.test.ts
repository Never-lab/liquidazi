import { describe, expect, it } from "vitest";
import { fiscalYearSnapshot as snap } from "../config/fiscalYearSnapshot";
import { advanceMonth } from "./advanceMonth";
import {
  complianceSpreadPenaltyBps,
  fidoMaxFor,
  FIDO_MAX,
  requestFido,
  requestLoan,
} from "./actions";
import { CAMPAIGN_WIN_MONTHS, createInitialGameState } from "./types";

describe("loop tension — compliance & campagna", () => {
  it("complianceSpreadPenaltyBps: soglie 70 e 40", () => {
    expect(complianceSpreadPenaltyBps(100)).toBe(0);
    expect(complianceSpreadPenaltyBps(70)).toBe(0);
    expect(complianceSpreadPenaltyBps(69)).toBe(100);
    expect(complianceSpreadPenaltyBps(40)).toBe(100);
    expect(complianceSpreadPenaltyBps(39)).toBe(200);
  });

  it("mutuo: compliance bassa alza lo spread", () => {
    let s = createInitialGameState();
    s.compliance = 35;
    s = requestLoan(s, {
      principal: 10000,
      tenorMonths: 12,
      rateType: "fixed",
      guarantee: "none",
    });
    expect(s.loan?.spreadBps).toBe(snap.loan_base_spread_bps + 200);
  });

  it("fido: tetto ridotto sotto compliance 40", () => {
    const s = createInitialGameState();
    s.compliance = 30;
    expect(fidoMaxFor(s)).toBe(Math.round(FIDO_MAX * 0.5));
    expect(requestFido(s, FIDO_MAX).fido).toBeNull();
    expect(requestFido(s, fidoMaxFor(s)).fido?.limit).toBe(fidoMaxFor(s));
  });

  it("24 mesi → status won una sola volta", () => {
    let s = createInitialGameState();
    s.quietMode = true;
    s.company.cash = 50000;
    s.monthsPlayed = CAMPAIGN_WIN_MONTHS - 1;
    s = advanceMonth(s);
    expect(s.monthsPlayed).toBe(CAMPAIGN_WIN_MONTHS);
    expect(s.status).toBe("won");
    expect(s.career.year2Reached).toBe(true);

    s.status = "running";
    s = advanceMonth(s);
    expect(s.status).toBe("running");
  });
});
