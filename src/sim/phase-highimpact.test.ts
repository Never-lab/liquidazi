import { describe, expect, it } from "vitest";
import { fiscalYearSnapshot as snap } from "../config/fiscalYearSnapshot";
import { advanceMonth } from "./advanceMonth";
import { fireEmployee, hireEmployee, issueCustomerInvoice } from "./actions";
import { baseGrossFor } from "../config/staffPay";
import {
  acceptOpportunity,
  generateOpportunities,
  maxDealNet,
  monthlyCapacity,
  seedNewGame,
} from "./events";
import { availableWorkforce } from "./workforce";
import { createInitialGameState, round2, toMonthIndex } from "./types";

describe("High-impact — settore, PA, capacità, TFR, 13ª", () => {
  it("tetto deal e capacità dipendono da settore/reputazione/staff", () => {
    const bare = createInitialGameState({ city: "058091", sector: "ristorazione" });
    const servizi = createInitialGameState({ city: "058091", sector: "servizi" });
    expect(maxDealNet(servizi)).toBeGreaterThan(maxDealNet(bare));
    expect(monthlyCapacity(bare)).toBeGreaterThanOrEqual(1);

    let hired = hireEmployee(bare, "Operaio");
    hired.staffMorale = 100;
    expect(availableWorkforce(hired)).toBeGreaterThan(availableWorkforce(bare));
  });

  it("opportunità vendita possono essere PA con termini lunghi", () => {
    const s = seedNewGame(createInitialGameState({ city: "058091", sector: "servizi" }));
    const { ops } = generateOpportunities({
      ...s,
      monthsPlayed: 3,
      nextId: 99,
      calendar: { month: 3, year: 2024 },
    }, { forceRegime: "normale" });
    const sales = ops.filter((o) => o.kind === "sale");
    expect(sales.length).toBeGreaterThan(0);
    for (const op of sales) {
      expect(op.termMonths).toBeGreaterThanOrEqual(1);
      expect(op.clientType === "pa" || op.clientType === "private").toBe(true);
      if (op.clientType === "pa") expect(op.termMonths).toBeGreaterThanOrEqual(3);
    }
  });

  it("accettare oltre FL disponibile viene bloccato", () => {
    let s = createInitialGameState({ city: "058091", sector: "commercio" });
    s = {
      ...s,
      opportunities: [
        {
          id: 1,
          kind: "sale",
          title: "A",
          net: 500,
          workforceRequired: 20,
          expiresInMonths: 1,
          clientType: "private",
          termMonths: 1,
        },
        {
          id: 2,
          kind: "sale",
          title: "B",
          net: 500,
          workforceRequired: 20,
          expiresInMonths: 1,
          clientType: "private",
          termMonths: 1,
        },
      ],
      nextId: 10,
    };
    s = acceptOpportunity(s, 1);
    const before = s.invoices.length;
    s = acceptOpportunity(s, 2);
    expect(s.invoices.length).toBe(before);
    expect(s.lastUiHint?.text).toMatch(/FL/);
  });

  it("PA: scadenza oltre 1 mese; quietMode non genera insoluti", () => {
    let s = createInitialGameState();
    s = issueCustomerInvoice(s, 1000, { clientType: "pa", termMonths: 4 });
    const inv = s.invoices[0]!;
    expect(inv.dueIdx).toBe(toMonthIndex(s.calendar) + 4);
    s = advanceMonth(s);
    expect(s.invoices[0]!.settled).toBe(false);
    for (let i = 0; i < 4; i++) s = advanceMonth(s);
    expect(s.invoices[0]!.settled).toBe(true);
    expect(s.invoices[0]!.defaulted).toBeFalsy();
  });

  it("insoluto: privato può non pagare fuori quietMode", () => {
    let s = createInitialGameState({ city: "058091", sector: "artigianato" });
    s = {
      ...s,
      quietMode: false,
      company: { ...s.company, sector: "artigianato", reputation: 50 },
    };
    // Force a due AR this month with high defaultChance path via many rolls:
    // craft invoice due now and monkey default by running settlement logic via advance
    s = issueCustomerInvoice(s, 800, { clientType: "private", termMonths: 1 });
    // Make default certain: temporarily we advance many seeded months until one defaults,
    // or set due and use a sector with defaults while checking either outcome is valid.
    let sawDefault = false;
    let sawPay = false;
    for (let m = 0; m < 80 && !(sawDefault && sawPay); m++) {
      let t = structuredClone(s);
      t.quietMode = false;
      t.monthsPlayed = m;
      t.invoices = [
        {
          id: 1,
          kind: "AR",
          net: 800,
          vat: 176,
          gross: 976,
          issuedIdx: toMonthIndex(t.calendar) - 1,
          dueIdx: toMonthIndex(t.calendar),
          settled: false,
          clientType: "private",
          defaulted: false,
        },
      ];
      t = advanceMonth(t);
      const inv = t.invoices[0]!;
      if (inv.defaulted) sawDefault = true;
      else if (inv.settled) sawPay = true;
    }
    expect(sawDefault).toBe(true);
    expect(sawPay).toBe(true);
  });

  it("licenziamento liquida il TFR maturato", () => {
    let s = createInitialGameState();
    s = hireEmployee(s, "Operaio");
    s = advanceMonth(s);
    s = advanceMonth(s);
    const emp = s.employees[0]!;
    expect(emp.tfrAccrued).toBeGreaterThan(0);
    expect(s.tfrFund).toBeCloseTo(emp.tfrAccrued);
    const cash0 = s.company.cash;
    const payout = emp.tfrAccrued;
    s = fireEmployee(s, emp.id);
    expect(s.employees).toHaveLength(0);
    expect(s.company.cash).toBeCloseTo(cash0 - payout);
    expect(s.tfrFund).toBeCloseTo(0);
  });

  it("dicembre: 13ª raddoppia il cedolino", () => {
    let s = createInitialGameState();
    s = hireEmployee(s, "Impiegato");
    s = { ...s, calendar: { month: 12, year: 2024 } };
    const gross = baseGrossFor(s.company.sector, "Impiegato");
    const expectedGross = round2(gross * 2);
    const inpsEmployee = round2(expectedGross * snap.inps_employee_rate);
    const irpef = round2(expectedGross * snap.irpef_withholding_simplified_rate);
    const net = round2(expectedGross - inpsEmployee - irpef);

    s = advanceMonth(s);
    expect(s.lastPayroll?.totalGross).toBeCloseTo(expectedGross);
    expect(s.lastPayroll?.totalNet).toBeCloseTo(net);
    expect(s.log.some((e) => e.text.includes("13ª"))).toBe(true);
  });
});
