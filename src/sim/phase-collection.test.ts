import { describe, expect, it } from "vitest";
import { fiscalYearSnapshot as snap } from "../config/fiscalYearSnapshot";
import {
  CARTELLA_EVENT_ID,
  maybeOpenCartella,
  resolveCartellaChoice,
  tickCollectionCase,
} from "./collection";
import {
  ENFORCEMENT_AGGIO,
  ENFORCEMENT_MONTHS_TO_TERMINAL,
  MONTHLY_MORA_RATE,
  RATEATION_FEE,
  RATEATION_MONTHS,
  TERMINAL_MONTHS_TO_LOST,
} from "../config/collection";
import { advanceMonth } from "./advanceMonth";
import { issueCustomerInvoice, payF24 } from "./actions";
import { createInitialGameState, round2, toMonthIndex } from "./types";

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

describe("fiscal cartella", () => {
  const seedOverdue = (cash = 0) => {
    let s = createInitialGameState();
    s.quietMode = true;
    s.company.cash = cash;
    const idx = toMonthIndex(s.calendar);
    s.liabilities.push({
      id: s.nextId++,
      kind: "IVA",
      amount: 500,
      dueIdx: idx - 1,
      paid: false,
      penalized: true,
    });
    s.monthsTaxOverdue = 6;
    return s;
  };

  it("a 6 mesi di insoluto apre cartella pending", () => {
    const s = seedOverdue();
    maybeOpenCartella(s);
    expect(s.pendingEvent?.id).toBe(CARTELLA_EVENT_ID);
    expect(s.collectionCase?.stage).toBe("cartella");
    expect(s.collectionCase?.principal).toBe(500);
  });

  it("advanceMonth apre cartella dopo 6 mesi continui di insoluto", () => {
    let s = createInitialGameState();
    s.quietMode = true;
    s = issueCustomerInvoice(s, 5000);
    for (let i = 0; i < 8 && !s.pendingEvent; i++) s = advanceMonth(s);
    expect(s.pendingEvent?.id).toBe(CARTELLA_EVENT_ID);
    expect(s.collectionCase?.stage).toBe("cartella");
  });

  it("pay_all chiude caso se cassa basta", () => {
    let s = seedOverdue(10000);
    maybeOpenCartella(s);
    s = resolveCartellaChoice(s, "pay_all");
    expect(s.collectionCase).toBeNull();
    expect(s.pendingEvent).toBeNull();
    expect(s.liabilities.every((l) => l.paid)).toBe(true);
    expect(s.company.cash).toBeCloseTo(9500);
  });

  it("rateize apre piano 12 mesi", () => {
    let s = seedOverdue();
    maybeOpenCartella(s);
    s = resolveCartellaChoice(s, "rateize");
    expect(s.collectionCase?.stage).toBe("rateazione");
    expect(s.pendingEvent).toBeNull();
    const total = round2(500 * (1 + RATEATION_FEE));
    expect(s.collectionCase?.principal).toBe(total);
    expect(s.collectionCase?.plan?.monthsLeft).toBe(RATEATION_MONTHS);
    expect(s.collectionCase?.plan?.totalMonths).toBe(RATEATION_MONTHS);
    expect(s.collectionCase?.plan?.installment).toBeCloseTo(round2(total / RATEATION_MONTHS));
  });

  it("ignore → enforcement", () => {
    let s = seedOverdue();
    maybeOpenCartella(s);
    s = resolveCartellaChoice(s, "ignore");
    expect(s.collectionCase?.stage).toBe("enforcement");
    expect(s.collectionCase?.monthsInStage).toBe(0);
    expect(s.pendingEvent).toBeNull();
  });

  it("invalid optionId leaves pendingEvent intact", () => {
    let s = seedOverdue();
    maybeOpenCartella(s);
    s = resolveCartellaChoice(s, "bogus");
    expect(s.pendingEvent?.id).toBe(CARTELLA_EVENT_ID);
    expect(s.collectionCase?.stage).toBe("cartella");
  });

  it("cartella snapshots liability ids", () => {
    const s = seedOverdue();
    const id = s.liabilities[0]!.id;
    maybeOpenCartella(s);
    expect(s.collectionCase?.liabilityIds).toEqual([id]);
  });

  it("payF24 is no-op during cartella (no double pay)", () => {
    let s = seedOverdue(10_000);
    maybeOpenCartella(s);
    const cash0 = s.company.cash;
    const principal0 = s.collectionCase!.principal;
    s = payF24(s);
    expect(s.company.cash).toBe(cash0);
    expect(s.liabilities.every((l) => !l.paid)).toBe(true);
    expect(s.collectionCase?.principal).toBe(principal0);
  });

  it("rateazione: new F24 payable; snapshot liabilities stay unpaid until close", () => {
    let s = seedOverdue(50_000);
    maybeOpenCartella(s);
    const snapId = s.collectionCase!.liabilityIds![0]!;
    s = resolveCartellaChoice(s, "rateize");
    expect(s.collectionCase?.stage).toBe("rateazione");

    const idx = toMonthIndex(s.calendar);
    const newId = s.nextId++;
    s.liabilities.push({
      id: newId,
      kind: "IVA",
      amount: 200,
      dueIdx: idx,
      paid: false,
      penalized: false,
    });
    s = payF24(s);
    expect(s.liabilities.find((l) => l.id === newId)?.paid).toBe(true);
    expect(s.liabilities.find((l) => l.id === snapId)?.paid).toBe(false);

    for (let i = 0; i < RATEATION_MONTHS; i++) {
      tickCollectionCase(s);
    }
    expect(s.collectionCase).toBeNull();
    expect(s.liabilities.find((l) => l.id === snapId)?.paid).toBe(true);
  });
});

describe("fiscal rateazione and enforcement", () => {
  it("rata saltata → enforcement", () => {
    let s = createInitialGameState();
    s.quietMode = true;
    s.company.cash = 0;
    s.treasury = 0;
    const installment = 100;
    s.collectionCase = {
      stage: "rateazione",
      principal: 1200,
      monthsInStage: 0,
      firstOverdueIdx: 0,
      plan: { installment, monthsLeft: 12, totalMonths: 12 },
    };
    tickCollectionCase(s);
    expect(s.collectionCase?.stage).toBe("enforcement");
    expect(s.collectionCase?.plan).toBeUndefined();
    expect(s.company.cash).toBe(0);
  });

  it("enforcement preleva cassa poi tesoreria + aggio", () => {
    let s = createInitialGameState();
    s.quietMode = true;
    s.company.cash = 300;
    s.treasury = 500;
    s.collectionCase = {
      stage: "enforcement",
      principal: 600,
      monthsInStage: 0,
      firstOverdueIdx: 0,
    };
    tickCollectionCase(s);
    expect(s.company.cash).toBe(0);
    const gross = 600;
    const aggio = round2(gross * ENFORCEMENT_AGGIO);
    expect(s.treasury).toBeCloseTo(500 - 300 - aggio);
    expect(s.collectionCase).toBeNull();
  });

  it("dopo 4 mesi enforcement sopra soglia → terminal → lost fiscale", () => {
    let s = createInitialGameState();
    s.quietMode = true;
    s.company.cash = 0;
    s.treasury = 0;
    s.collectionCase = {
      stage: "enforcement",
      principal: 5000,
      monthsInStage: 0,
      firstOverdueIdx: 0,
    };
    for (let i = 0; i < ENFORCEMENT_MONTHS_TO_TERMINAL; i++) {
      tickCollectionCase(s);
    }
    expect(s.collectionCase?.stage).toBe("terminal");
    expect(s.collectionCase?.monthsInStage).toBe(0);
    for (let i = 0; i < TERMINAL_MONTHS_TO_LOST; i++) {
      tickCollectionCase(s);
    }
    expect(s.status).toBe("lost");
    expect(s.loseReason).toBe("fiscal");
  });

  it("clear dues before month 6 → no cartella", () => {
    let s = createInitialGameState();
    s.quietMode = true;
    for (let i = 0; i < 10; i++) {
      s = issueCustomerInvoice(s, 1000);
      s = advanceMonth(s);
      s = payF24(s);
      s = advanceMonth(s);
    }
    expect(s.pendingEvent?.id).not.toBe(CARTELLA_EVENT_ID);
    expect(s.collectionCase).toBeNull();
  });
});
