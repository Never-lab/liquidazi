import { describe, expect, it } from "vitest";
import { hireEmployee } from "./actions";
import { acceptOpportunity, generateOpportunities } from "./events";
import { createInitialGameState } from "./types";
import {
  availableWorkforce,
  canAcceptWorkforce,
  workforceRequiredForNet,
  workforceRemaining,
  workforceUsedThisMonth,
} from "./workforce";
import { WORKFORCE_BASE, workforceForRole } from "../config/workforce";

describe("workforce config", () => {
  it("base FL senza dipendenti = 30", () => {
    const s = createInitialGameState({ city: "058091", sector: "servizi" });
    expect(availableWorkforce(s)).toBe(WORKFORCE_BASE);
  });

  it("ruoli hanno FL distinte", () => {
    expect(workforceForRole("Operaio")).toBe(5);
    expect(workforceForRole("Impiegato")).toBe(8);
    expect(workforceForRole("Responsabile")).toBe(12);
  });

  it("2k net richiede ~30 FL (curva ammorbidita)", () => {
    expect(workforceRequiredForNet(2000)).toBeGreaterThanOrEqual(28);
    expect(workforceRequiredForNet(2000)).toBeLessThanOrEqual(32);
  });
});

describe("accettazione commesse per FL", () => {
  it("senza personale non accetta commessa oltre la FL base", () => {
    let s = createInitialGameState({ city: "058091", sector: "servizi" });
    s.quietMode = true;
    s.opportunities = [
      {
        id: 1,
        kind: "sale",
        title: "Commessa grossa",
        net: 5000,
        workforceRequired: 50,
        expiresInMonths: 1,
        clientType: "private",
        termMonths: 1,
        marketLayer: "local",
      },
    ];
    expect(canAcceptWorkforce(s, 50)).toBe(false);
    const blocked = acceptOpportunity(s, 1);
    expect(blocked.invoices).toHaveLength(0);
    expect(blocked.lastUiHint?.tone).toBe("bad");
  });

  it("con operaio accetta commessa entro la FL", () => {
    let s = createInitialGameState({ city: "058091", sector: "servizi" });
    s = hireEmployee(s, "Operaio");
    s.quietMode = true;
    s.opportunities = [
      {
        id: 1,
        kind: "sale",
        title: "Commessa media",
        net: 2000,
        workforceRequired: 35,
        expiresInMonths: 1,
        clientType: "private",
        termMonths: 1,
        marketLayer: "local",
      },
    ];
    expect(availableWorkforce(s)).toBe(WORKFORCE_BASE + 5);
    expect(canAcceptWorkforce(s, 35)).toBe(true);
    s = acceptOpportunity(s, 1);
    expect(s.invoices).toHaveLength(1);
    expect(s.invoices[0]!.workforceRequired).toBe(35);
    expect(workforceUsedThisMonth(s)).toBe(35);
    expect(workforceRemaining(s)).toBe(0);
  });

  it("comunale generato ha FL umana (non centinaia)", () => {
    const s = createInitialGameState({ city: "058091", sector: "servizi" });
    s.company.repMunicipal = 80;
    s.monthsPlayed = 20;
    const { ops } = generateOpportunities(s, { forceRegime: "normale" });
    const municipal = ops.filter((o) => o.marketLayer === "municipal");
    expect(municipal.length).toBeGreaterThan(0);
    for (const op of municipal) {
      expect(op.workforceRequired).toBeGreaterThan(0);
      expect(op.workforceRequired).toBeLessThanOrEqual(90);
    }
  });

  it("early board: commesse locali rispettano il budget FL", () => {
    const s = createInitialGameState({ city: "058091", sector: "servizi" });
    s.monthsPlayed = 2;
    const { ops } = generateOpportunities(s, { forceRegime: "normale" });
    const localSales = ops.filter((o) => o.kind === "sale" && o.marketLayer === "local");
    expect(localSales.length).toBeGreaterThan(0);
    for (const op of localSales) {
      expect(op.workforceRequired ?? 0).toBeLessThanOrEqual(
        Math.floor(availableWorkforce(s) * 0.9),
      );
    }
  });

  it("early board: forniture non superano ~40% cassa", () => {
    const s = createInitialGameState({ city: "058091", sector: "servizi" });
    s.monthsPlayed = 1;
    s.company.cash = 10000;
    const { ops } = generateOpportunities(s, { forceRegime: "normale" });
    const supplies = ops.filter((o) => o.kind === "supply");
    for (const op of supplies) {
      expect(op.net).toBeLessThanOrEqual(6500);
    }
  });
});
