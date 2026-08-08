import { describe, expect, it } from "vitest";
import { fiscalYearSnapshot as snap } from "../config/fiscalYearSnapshot";
import { advanceMonth } from "./advanceMonth";
import { skipProjectOffer } from "./projects";
import {
  acceptLoanOffer,
  buildLoanSchedule,
  canRequestLoan,
  drawFido,
  frenchPayment,
  requestFido,
  requestLoan,
} from "./actions";
import { createInitialGameState, round2 } from "./types";

describe("Phase 6 — prestito", () => {
  it("erogazione: cash sale del principal, spread da snapshot", () => {
    let s = createInitialGameState();
    const cash0 = s.company.cash;
    s = requestLoan(s, {
      principal: 12000,
      tenorMonths: 12,
      rateType: "fixed",
      guarantee: "none",
    });
    expect(s.company.cash).toBe(cash0 + 12000);
    expect(s.loan?.outstanding).toBe(12000);
    expect(s.loan?.spreadBps).toBe(snap.loan_base_spread_bps);
  });

  it("fondo di garanzia: più credito approvabile e spread più basso — non è un contributo", () => {
    const s = createInitialGameState();
    expect(canRequestLoan(s, snap.loan_max_principal_fondo, "none")).toBe(false);
    expect(canRequestLoan(s, snap.loan_max_principal_fondo, "fondo_garanzia_pmi")).toBe(true);

    const withFondo = requestLoan(s, {
      principal: 10000,
      tenorMonths: 12,
      rateType: "fixed",
      guarantee: "fondo_garanzia_pmi",
    });
    expect(withFondo.loan?.spreadBps).toBe(
      snap.loan_base_spread_bps - snap.fondo_garanzia_spread_discount_bps,
    );
    // il principal è debito erogato dalla banca, non un grant: outstanding pieno
    expect(withFondo.loan?.outstanding).toBe(10000);
  });

  it("rata fissa (francese): rata costante, quota capitale cresce nel tempo", () => {
    let s = createInitialGameState();
    s = requestLoan(s, {
      principal: 12000,
      tenorMonths: 12,
      rateType: "fixed",
      guarantee: "none",
    });
    const cashAfterLoan = s.company.cash;
    const annualRate = snap.euribor_3m_path[0] + snap.loan_base_spread_bps / 10000;
    const schedule = buildLoanSchedule(12000, annualRate, 12);
    const row1 = schedule[0]!;
    const payment = frenchPayment(12000, annualRate, 12);

    expect(s.loan?.monthlyPayment).toBeCloseTo(payment);

    s = advanceMonth(s);
    expect(s.loan?.outstanding).toBeCloseTo(row1.residual);
    expect(s.company.cash).toBeCloseTo(cashAfterLoan - row1.payment);
    expect(s.loan?.lastInstallment?.interest).toBeCloseTo(row1.interest);
    expect(s.loan?.lastInstallment?.principal).toBeCloseTo(row1.principal);

    // rata costante (a tasso fisso) su più mensilità
    s = advanceMonth(s);
    expect(s.loan?.lastInstallment?.interest! + s.loan?.lastInstallment?.principal!).toBeCloseTo(
      payment,
    );
    expect(s.loan?.lastInstallment?.principal).toBeGreaterThan(row1.principal);
  });

  it("tasso variabile: segue il path Euribor dello snapshot", () => {
    let s = createInitialGameState();
    s = requestLoan(s, {
      principal: 12000,
      tenorMonths: 12,
      rateType: "floating",
      guarantee: "none",
    });
    const spread = snap.loan_base_spread_bps / 10000;
    const originationRate = snap.euribor_3m_path[0] + spread;
    const payment = frenchPayment(12000, originationRate, 12);
    expect(s.loan?.monthlyPayment).toBeCloseTo(payment);

    // ricalcolo indipendente mese per mese col tasso Euribor reale del path
    let outstanding = 12000;
    let expectedInterestMonth3 = 0;
    for (let m = 0; m < 3; m++) {
      const annualRate = snap.euribor_3m_path[m] + spread;
      const interest = round2((outstanding * annualRate) / 12);
      let principal = round2(payment - interest);
      if (m + 1 >= 12 || principal > outstanding) principal = outstanding;
      else if (principal < 0) principal = 0;
      outstanding = round2(outstanding - principal);
      expectedInterestMonth3 = interest;
    }

    s = advanceMonth(s); // mese 0: euribor[0]
    s = advanceMonth(s); // mese 1: euribor[1]
    s = advanceMonth(s); // mese 2: euribor[2] = 0.034 (diverso da [0])

    expect(s.loan?.lastInstallment?.interest).toBeCloseTo(expectedInterestMonth3);
    expect(s.loan?.outstanding).toBeCloseTo(outstanding);
    expect(snap.euribor_3m_path[2]).not.toBe(snap.euribor_3m_path[0]);
  });

  it("rate spike: principalShare negativo → solo interessi, niente estinzione anticipata", () => {
    let s = createInitialGameState();
    s = requestLoan(s, {
      principal: 10000,
      tenorMonths: 12,
      rateType: "fixed",
      guarantee: "none",
    });
    // monthlyPayment fissato a origination; tasso effettivo sale → interessi > rata
    s = {
      ...s,
      loan: {
        ...s.loan!,
        monthlyPayment: 100,
        fixedAnnualRate: 0.24,
      },
    };
    const outstandingBefore = s.loan!.outstanding;
    s = advanceMonth(s);
    expect(s.loan?.lastInstallment?.principal).toBe(0);
    expect(s.loan?.outstanding).toBe(outstandingBefore);
    expect(s.loan?.lastInstallment?.interest).toBeCloseTo(200);
  });

  it("estinzione: dopo il tenor l'outstanding è zero e non escono più rate", () => {
    let s = createInitialGameState();
    s = requestLoan(s, {
      principal: 1200,
      tenorMonths: 3,
      rateType: "fixed",
      guarantee: "none",
    });
    for (let i = 0; i < 4; i++) s = advanceMonth(s);
    expect(s.loan).toBeNull();
    expect(s.loans ?? []).toHaveLength(0);
  });
});

describe("Phase 6 — lose / soft win", () => {
  it("12 chiusure in rosso → lost + offerta prestito lungo il percorso", () => {
    let s = createInitialGameState();
    for (let i = 0; i < 12; i++) {
      s = { ...s, company: { ...s.company, cash: -500 }, loanOffer: null };
      s = advanceMonth(s);
    }
    expect(s.status).toBe("lost");
    expect(s.monthsBelowZero).toBeGreaterThanOrEqual(12);
    expect(s.loseReason).toBe("cash");
  });

  it("la cassa che risale azzera il contatore", () => {
    let s = createInitialGameState();
    s = { ...s, company: { ...s.company, cash: -1000 } };
    s = advanceMonth(s);
    expect(s.monthsBelowZero).toBe(1);
    expect(s.loanOffer).not.toBeNull();
    s = { ...s, company: { ...s.company, cash: 500 } };
    s = advanceMonth(s);
    expect(s.monthsBelowZero).toBe(0);
    expect(s.status).toBe("running");
  });

  it("24 mesi → soft win (year2Reached)", () => {
    let s = createInitialGameState();
    s.quietMode = true;
    s.company.cash = 80000;
    for (let i = 0; i < 24; i++) {
      if (s.projectOffer) s = skipProjectOffer(s);
      s = advanceMonth(s);
    }
    expect(s.status).toBe("won");
    expect(s.monthsPlayed).toBe(24);
    expect(s.career.year2Reached).toBe(true);
  });

  it("accettare l'offerta di salvataggio eroga il prestito", () => {
    let s = createInitialGameState();
    s = { ...s, company: { ...s.company, cash: -2000 } };
    s = advanceMonth(s);
    expect(s.loanOffer).not.toBeNull();
    const principal = s.loanOffer!.principal;
    s = acceptLoanOffer(s);
    expect(s.loan?.outstanding).toBe(principal);
    expect(s.distressLoanTaken).toBe(true);
    expect(s.loanOffer).toBeNull();
    expect(s.company.cash).toBeGreaterThan(0);
  });

  it("fido: prelievo e interessi; mutuo può coesistere", () => {
    let s = createInitialGameState();
    s = requestFido(s, 8000);
    s = drawFido(s, 3000);
    expect(s.fido?.drawn).toBe(3000);
    expect(s.company.cash).toBe(13000);
    s = requestLoan(s, {
      principal: 5000,
      tenorMonths: 12,
      rateType: "fixed",
      guarantee: "none",
    });
    expect(s.loan?.outstanding).toBe(5000);
    expect(s.fido?.drawn).toBe(3000);
    const cashBefore = s.company.cash;
    s = advanceMonth(s);
    // rata mutuo + interessi fido; rimborso auto del fido se cassa > 0
    expect(s.company.cash).toBeLessThan(cashBefore);
  });

  it("a partita finita advanceMonth non fa nulla", () => {
    let s = createInitialGameState();
    s = { ...s, status: "lost" as const };
    const frozen = JSON.stringify(s);
    s = advanceMonth(s);
    expect(JSON.stringify(s)).toBe(frozen);
  });
});
