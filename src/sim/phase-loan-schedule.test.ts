import { describe, expect, it } from "vitest";
import {
  buildLoanOffers,
  buildLoanSchedule,
  frenchPayment,
  loanRefusalReason,
  monthlyRateFromAnnual,
  remainingSchedule,
  requestLoan,
} from "./actions";
import { createInitialGameState } from "./types";

describe("Phase loan schedule — French amortization helpers", () => {
  it("monthlyRateFromAnnual: converte tasso annuale in mensile", () => {
    expect(monthlyRateFromAnnual(0.12)).toBeCloseTo(0.01);
    expect(monthlyRateFromAnnual(0)).toBe(0);
  });

  it("frenchPayment: rata costante coerente con la formula di ammortamento francese", () => {
    const P = 12000;
    const annual = 0.05;
    const n = 12;
    const payment = frenchPayment(P, annual, n);
    const r = monthlyRateFromAnnual(annual);
    const pow = (1 + r) ** n;
    const expected = Math.round(((P * r * pow) / (pow - 1)) * 100) / 100;
    expect(payment).toBeCloseTo(expected);
  });

  it("frenchPayment: tasso zero → rata lineare (principal / tenor)", () => {
    expect(frenchPayment(12000, 0, 12)).toBeCloseTo(1000);
  });

  it("frenchPayment: tenor <= 0 → 0", () => {
    expect(frenchPayment(12000, 0.05, 0)).toBe(0);
  });

  it("somma capitali ≈ principal; residuo finale 0", () => {
    const P = 12000;
    const annual = 0.05;
    const n = 12;
    const rows = buildLoanSchedule(P, annual, n);
    expect(rows).toHaveLength(12);
    const sumP = rows.reduce((s, r) => s + r.principal, 0);
    expect(sumP).toBeCloseTo(P, 0);
    expect(rows[n - 1]!.residual).toBeCloseTo(0, 0);
  });

  it("buildLoanSchedule: rata costante per tutte le righe (tranne l'ultima se clampata)", () => {
    const rows = buildLoanSchedule(12000, 0.05, 12);
    const firstPayment = rows[0]!.payment;
    for (const row of rows.slice(0, -1)) {
      expect(row.payment).toBeCloseTo(firstPayment);
    }
  });

  it("buildLoanSchedule: quota capitale cresce, quota interessi scende nel tempo", () => {
    const rows = buildLoanSchedule(12000, 0.05, 12);
    expect(rows[11]!.principal).toBeGreaterThan(rows[0]!.principal);
    expect(rows[11]!.interest).toBeLessThan(rows[0]!.interest);
  });

  it("remainingSchedule: ricalcola da un outstanding parziale con mesi residui", () => {
    const rows = remainingSchedule(6000, 0.05, 6);
    expect(rows).toHaveLength(6);
    expect(rows[5]!.residual).toBeCloseTo(0, 0);
    const sumP = rows.reduce((s, r) => s + r.principal, 0);
    expect(sumP).toBeCloseTo(6000, 0);
  });

  it("monthIndex è 1-based", () => {
    const rows = buildLoanSchedule(1200, 0.05, 3);
    expect(rows.map((r) => r.monthIndex)).toEqual([1, 2, 3]);
  });
});

describe("loanRefusalReason", () => {
  it("nessun motivo di rifiuto per un'offerta valida", () => {
    const s = createInitialGameState();
    expect(loanRefusalReason(s, 10000, "none")).toBeNull();
  });

  it("un mutuo attivo consente il secondo; a 2 → rifiuto", () => {
    let s = createInitialGameState();
    s = requestLoan(s, {
      principal: 10000,
      tenorMonths: 12,
      rateType: "fixed",
      guarantee: "none",
    });
    expect(loanRefusalReason(s, 5000, "none")).toBeNull();
    s = requestLoan(s, {
      principal: 5000,
      tenorMonths: 12,
      rateType: "fixed",
      guarantee: "none",
    });
    expect(loanRefusalReason(s, 5000, "none")).toBe(
      "Hai già 2 mutui aperti: rifinanzia o chiudi un piano",
    );
  });

  it("40k senza Fondo PMI supera il tetto → rifiuto", () => {
    const s = createInitialGameState();
    expect(loanRefusalReason(s, 40000, "none")).toBe(
      "Importo oltre il tetto: serve una garanzia / Fondo PMI",
    );
    expect(loanRefusalReason(s, 40000, "fondo_garanzia_pmi")).toBeNull();
  });

  it("importo non positivo → rifiuto", () => {
    const s = createInitialGameState();
    expect(loanRefusalReason(s, 0, "none")).toBe("Inserisci un importo positivo");
    expect(loanRefusalReason(s, -1000, "none")).toBe("Inserisci un importo positivo");
  });
});

describe("buildLoanOffers", () => {
  it("restituisce 3 carte offerta con rata e TAN calcolati", () => {
    const s = createInitialGameState();
    const offers = buildLoanOffers(s);
    expect(offers).toHaveLength(3);
    for (const o of offers) {
      expect(o.annualRate).toBeGreaterThan(0);
      expect(o.monthlyPayment).toBeGreaterThan(0);
      expect(o.disabledReason).toBeNull();
    }
    expect(offers.map((o) => o.principal)).toEqual([10000, 30000, 60000]);
    expect(offers.map((o) => o.tenorMonths)).toEqual([12, 24, 36]);
    expect(offers[2]!.guarantee).toBe("fondo_garanzia_pmi");
  });

  it("con 2 mutui attivi, tutte le carte sono disabilitate", () => {
    let s = createInitialGameState();
    s = requestLoan(s, {
      principal: 10000,
      tenorMonths: 12,
      rateType: "fixed",
      guarantee: "none",
    });
    s = requestLoan(s, {
      principal: 8000,
      tenorMonths: 12,
      rateType: "fixed",
      guarantee: "none",
    });
    const offers = buildLoanOffers(s);
    expect(offers).toHaveLength(3);
    for (const o of offers) {
      expect(o.disabledReason).toBe(
        "Hai già 2 mutui aperti: rifinanzia o chiudi un piano",
      );
    }
  });
});
