import { describe, expect, it } from "vitest";
import { fiscalYearSnapshot as snap } from "../config/fiscalYearSnapshot";
import { advanceMonth } from "./advanceMonth";
import { canRequestLoan, requestLoan } from "./actions";
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

  it("rata fissa: quota capitale costante + interessi sull'outstanding", () => {
    let s = createInitialGameState();
    s = requestLoan(s, {
      principal: 12000,
      tenorMonths: 12,
      rateType: "fixed",
      guarantee: "none",
    });
    const cashAfterLoan = s.company.cash;
    const annualRate = snap.euribor_3m_path[0] + snap.loan_base_spread_bps / 10000;
    const interest1 = round2((12000 * annualRate) / 12);

    s = advanceMonth(s);
    expect(s.loan?.outstanding).toBe(11000);
    expect(s.company.cash).toBeCloseTo(cashAfterLoan - 1000 - interest1);
    expect(s.loan?.lastInstallment?.interest).toBeCloseTo(interest1);
  });

  it("tasso variabile: segue il path Euribor dello snapshot", () => {
    let s = createInitialGameState();
    s = requestLoan(s, {
      principal: 12000,
      tenorMonths: 12,
      rateType: "floating",
      guarantee: "none",
    });
    s = advanceMonth(s); // mese 0: euribor[0]
    s = advanceMonth(s); // mese 1: euribor[1]
    s = advanceMonth(s); // mese 2: euribor[2] = 0.034 (diverso da [0])

    const spread = snap.loan_base_spread_bps / 10000;
    const expected = round2((10000 * (snap.euribor_3m_path[2] + spread)) / 12);
    expect(s.loan?.lastInstallment?.interest).toBeCloseTo(expected);
    expect(snap.euribor_3m_path[2]).not.toBe(snap.euribor_3m_path[0]);
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
    expect(s.loan?.outstanding).toBe(0);
  });
});

describe("Phase 6 — win/lose", () => {
  it("cassa negativa per 3 mesi consecutivi → sconfitta", () => {
    let s = { ...createInitialGameState() };
    s.company.cash = -1000;
    s = advanceMonth(s);
    s = advanceMonth(s);
    expect(s.status).toBe("running");
    s = advanceMonth(s);
    expect(s.status).toBe("lost");
  });

  it("la cassa che risale azzera il contatore", () => {
    let s = createInitialGameState();
    s.company.cash = -1000;
    s = advanceMonth(s);
    s.company.cash = 500; // rientro
    s = advanceMonth(s);
    s.company.cash = -1000;
    s = advanceMonth(s);
    s = advanceMonth(s);
    expect(s.status).toBe("running");
  });

  it("24 mesi di sopravvivenza con cassa >= 0 → vittoria", () => {
    let s = createInitialGameState();
    for (let i = 0; i < 24; i++) s = advanceMonth(s);
    expect(s.status).toBe("won");
    expect(s.monthsPlayed).toBe(24);
  });

  it("a partita finita advanceMonth non fa nulla", () => {
    let s = createInitialGameState();
    for (let i = 0; i < 24; i++) s = advanceMonth(s);
    const frozen = JSON.stringify(s);
    s = advanceMonth(s);
    expect(JSON.stringify(s)).toBe(frozen);
  });
});
