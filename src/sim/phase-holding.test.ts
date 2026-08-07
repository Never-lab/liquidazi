import { describe, expect, it } from "vitest";
import { fiscalYearSnapshot as snap } from "../config/fiscalYearSnapshot";
import { HOLDING_SLOT_BASE } from "../config/holding";
import { advanceMonth } from "./advanceMonth";
import { issueCustomerInvoice, payF24 } from "./actions";
import {
  acceptSaleOffer,
  advanceHoldingSales,
  applySubsidiaryMonth,
  buyAcquisition,
  estimateSubsidiaryValue,
  generateAcquisitionBoard,
  investSubsidiaryCapex,
  listSubsidiaryForSale,
  refreshAcquisitionBoard,
  rejectSaleOffer,
} from "./acquisitions";
import { skipProjectOffer } from "./projects";
import {
  calendarFromIndex,
  createInitialGameState,
  round2,
  toMonthIndex,
  type GameState,
} from "./types";

describe("holding buy + value", () => {
  it("estimate scales with EBITDA and risk", () => {
    const base = estimateSubsidiaryValue({
      monthlyEbitda: 1000,
      risk: "med",
      monthsOwned: 0,
    });
    expect(base).toBe(11000);
    const high = estimateSubsidiaryValue({
      monthlyEbitda: 1000,
      risk: "high",
      monthsOwned: 0,
    });
    expect(high).toBe(9900);
  });

  it("buy stores purchasePrice and respects holdingSlotCap", () => {
    let s = createInitialGameState({ city: "058091", sector: "servizi" });
    s.quietMode = true;
    s.company.cash = 5_000_000;
    s.holdingSlotCap = HOLDING_SLOT_BASE;
    s = refreshAcquisitionBoard(s);
    const t = s.acquisitionBoard[0]!;
    s = buyAcquisition(s, t.id);
    expect(s.subsidiaries[0]!.purchasePrice).toBe(t.price);
    while (s.subsidiaries.length < s.holdingSlotCap) {
      s.company.cash = 5_000_000;
      const g = generateAcquisitionBoard(s);
      s.acquisitionBoard = g.board;
      s.nextId = g.nextId;
      s = buyAcquisition(s, s.acquisitionBoard[0]!.id);
    }
    expect(s.subsidiaries).toHaveLength(HOLDING_SLOT_BASE);
    s.company.cash = 5_000_000;
    const g2 = generateAcquisitionBoard(s);
    s.acquisitionBoard = g2.board;
    s.nextId = g2.nextId;
    const blocked = buyAcquisition(s, s.acquisitionBoard[0]!.id);
    expect(blocked.subsidiaries).toHaveLength(HOLDING_SLOT_BASE);
  });
});

describe("holding CAPEX + drift", () => {
  it("CAPEX raises EBITDA, costs cash, sets cooldown", () => {
    let s = createInitialGameState();
    s.company.cash = 100000;
    s.ytd.capitalGains = 0;
    s.subsidiaries = [
      {
        id: 1,
        name: "Co",
        sector: "servizi",
        monthlyEbitda: 1000,
        capacityBonus: 0,
        monthsOwned: 1,
        risk: "med",
        purchasePrice: 20000,
        listedUntilMonthIdx: null,
        capexCooldownMonths: 0,
      },
    ];
    const before = s.company.cash;
    s = investSubsidiaryCapex(s, 1);
    expect(s.subsidiaries[0]!.monthlyEbitda).toBe(1160);
    expect(s.company.cash).toBe(before - 6000);
    expect(s.ytd.otherCosts).toBe(6000);
    expect(s.subsidiaries[0]!.capexCooldownMonths).toBe(6);
    const blocked = investSubsidiaryCapex(s, 1);
    expect(blocked.company.cash).toBe(s.company.cash);
  });

  it("drift changes EBITDA each month", () => {
    let s = createInitialGameState();
    s.quietMode = true;
    s.subsidiaries = [
      {
        id: 1,
        name: "Co",
        sector: "servizi",
        monthlyEbitda: 1000,
        capacityBonus: 0,
        monthsOwned: 0,
        risk: "low",
        purchasePrice: 10000,
        listedUntilMonthIdx: null,
        capexCooldownMonths: 2,
      },
    ];
    const initialCash = s.company.cash;
    applySubsidiaryMonth(s, () => 0.99);
    expect(s.subsidiaries[0]!.monthlyEbitda).toBe(1010);
    expect(s.subsidiaries[0]!.capexCooldownMonths).toBe(1);
    expect(s.company.cash).toBe(initialCash + 1010);
  });

  it("CAPEX blocked while listed", () => {
    let s = createInitialGameState();
    s.company.cash = 100000;
    s.subsidiaries = [
      {
        id: 1,
        name: "Co",
        sector: "servizi",
        monthlyEbitda: 1000,
        capacityBonus: 0,
        monthsOwned: 1,
        risk: "med",
        purchasePrice: 10000,
        listedUntilMonthIdx: toMonthIndex(s.calendar) + 2,
        capexCooldownMonths: 0,
      },
    ];
    const blocked = investSubsidiaryCapex(s, 1);
    expect(blocked.company.cash).toBe(s.company.cash);
  });
});

const flipSub = () => ({
  id: 7,
  name: "Flip Co",
  sector: "servizi" as const,
  monthlyEbitda: 1000,
  capacityBonus: 0,
  monthsOwned: 0,
  risk: "med" as const,
  purchasePrice: 8000,
  listedUntilMonthIdx: null,
  capexCooldownMonths: 0,
});

describe("holding list + flip", () => {
  it("list then first listing month spawns offer", () => {
    let s = createInitialGameState();
    s.subsidiaries = [flipSub()];
    s = listSubsidiaryForSale(s, 7);
    advanceHoldingSales(s, () => 0);
    expect(s.saleOffers).toHaveLength(1);
    expect(s.saleOffers[0]!.subsidiaryId).toBe(7);
  });

  it("offer survives listing expiry until expiresMonthIdx", () => {
    let s = createInitialGameState();
    s.subsidiaries = [flipSub()];
    s = listSubsidiaryForSale(s, 7);
    const listedUntil = s.subsidiaries[0]!.listedUntilMonthIdx!;

    s.calendar = calendarFromIndex(listedUntil);
    advanceHoldingSales(s, () => 0);
    expect(s.saleOffers).toHaveLength(1);
    expect(s.saleOffers[0]!.expiresMonthIdx).toBe(listedUntil + 1);

    s.calendar = calendarFromIndex(listedUntil + 1);
    advanceHoldingSales(s, () => 0);
    expect(s.subsidiaries[0]!.listedUntilMonthIdx).toBeNull();
    expect(s.saleOffers).toHaveLength(1);

    s.calendar = calendarFromIndex(listedUntil + 2);
    advanceHoldingSales(s, () => 0);
    expect(s.saleOffers).toHaveLength(0);
  });

  it("rejectSaleOffer removes one offer", () => {
    let s = createInitialGameState();
    s.saleOffers = [{ id: 1, subsidiaryId: 7, price: 1000, expiresMonthIdx: 999 }];
    s = rejectSaleOffer(s, 1);
    expect(s.saleOffers).toHaveLength(0);
  });

  it("list → offer → accept: cash and capitalGains", () => {
    let s = createInitialGameState();
    s.quietMode = true;
    s.company.cash = 0;
    s.ytd.capitalGains = 0;
    s.subsidiaries = [flipSub()];
    s = listSubsidiaryForSale(s, 7);
    expect(s.subsidiaries[0]!.listedUntilMonthIdx).not.toBeNull();
    s.saleOffers = [
      {
        id: 99,
        subsidiaryId: 7,
        price: 12000,
        expiresMonthIdx: toMonthIndex(s.calendar) + 1,
      },
    ];
    s.nextId = 100;
    const cash0 = s.company.cash;
    s = acceptSaleOffer(s, 99);
    expect(s.subsidiaries).toHaveLength(0);
    expect(s.company.cash).toBe(cash0 + 12000);
    expect(s.ytd.capitalGains).toBe(4000);
    expect(s.saleOffers).toHaveLength(0);
  });
});

const playToNovember = (s: GameState): GameState => {
  for (let i = 0; i < 11; i++) {
    s = issueCustomerInvoice(s, 10000);
    if (s.projectOffer) s = skipProjectOffer(s);
    s = advanceMonth(s);
    s = payF24(s);
  }
  return s;
};

describe("holding FY plusvalenza", () => {
  it("positive capitalGains increases December IRES", () => {
    let baseline = createInitialGameState();
    baseline.quietMode = true;
    baseline = playToNovember(baseline);
    baseline = issueCustomerInvoice(baseline, 10000);
    if (baseline.projectOffer) baseline = skipProjectOffer(baseline);
    baseline = advanceMonth(baseline);
    const iresBaseline = baseline.lastYearReport!.ires;

    let withGains = createInitialGameState();
    withGains.quietMode = true;
    withGains = playToNovember(withGains);
    withGains.ytd.capitalGains = 10000;
    withGains = issueCustomerInvoice(withGains, 10000);
    if (withGains.projectOffer) withGains = skipProjectOffer(withGains);
    withGains = advanceMonth(withGains);

    expect(withGains.lastYearReport?.capitalGains).toBe(10000);
    expect(withGains.lastYearReport?.profit).toBeCloseTo(
      baseline.lastYearReport!.profit + 10000,
    );
    expect(withGains.lastYearReport?.ires).toBeCloseTo(
      iresBaseline + round2(10000 * snap.ires_rate),
    );
    expect(withGains.lastYearReport?.irap).toBeCloseTo(baseline.lastYearReport!.irap);
    expect(withGains.ytd.capitalGains).toBe(0);
  });
});
