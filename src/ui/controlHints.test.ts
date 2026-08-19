import { describe, expect, it } from "vitest";
import {
  capexHint,
  f24PayHint,
  growthInvestHint,
  loanOfferHint,
  monthCloseHint,
  projectOfferAcceptHint,
  treasuryDepositHint,
  treasuryWithdrawHint,
  upgradeBuyHint,
} from "./controlHints";

describe("monthCloseHint", () => {
  it("null when free", () => {
    expect(monthCloseHint({ pendingEvent: false })).toBeNull();
  });
  it("event blocks close", () => {
    expect(monthCloseHint({ pendingEvent: true })).toMatch(/evento/i);
  });
});

describe("capexHint", () => {
  it("listed beats cooldown", () => {
    expect(
      capexHint({
        listed: true,
        cooldownMonths: 3,
        shortCash: true,
        costLabel: "6.000 €",
      }),
    ).toMatch(/vendita/i);
  });
  it("cooldown explains wait", () => {
    expect(
      capexHint({
        listed: false,
        cooldownMonths: 4,
        shortCash: false,
        costLabel: "6.000 €",
      }),
    ).toMatch(/4/);
  });
  it("short cash names amount", () => {
    expect(
      capexHint({
        listed: false,
        cooldownMonths: 0,
        shortCash: true,
        costLabel: "6.000 €",
      }),
    ).toMatch(/6\.000/);
  });
});

describe("f24PayHint", () => {
  it("blocked by collection", () => {
    expect(f24PayHint({ dueNow: 100, blocked: true })).toMatch(/riscossione|cartella/i);
  });
  it("nothing due", () => {
    expect(f24PayHint({ dueNow: 0, blocked: false })).toMatch(/nessun|dovuto/i);
  });
});

describe("upgradeBuyHint", () => {
  it("at max", () => {
    expect(
      upgradeBuyHint({ atMax: true, shortCash: false, costLabel: "1 €" }),
    ).toMatch(/massimo|Lv3|livello/i);
  });
  it("short cash", () => {
    expect(
      upgradeBuyHint({ atMax: false, shortCash: true, costLabel: "5.000 €" }),
    ).toMatch(/5\.000|cassa/i);
  });
});

describe("treasuryDepositHint", () => {
  it("below min", () => {
    expect(
      treasuryDepositHint({ belowMin: true, shortCash: false, minLabel: "500 €" }),
    ).toMatch(/500/);
  });
  it("short cash", () => {
    expect(
      treasuryDepositHint({ belowMin: false, shortCash: true, minLabel: "500 €" }),
    ).toMatch(/cassa/i);
  });
});

describe("treasuryWithdrawHint", () => {
  it("invalid amount", () => {
    expect(
      treasuryWithdrawHint({ invalidAmount: true, overBalance: false }),
    ).toMatch(/zero|importo/i);
  });
  it("over balance", () => {
    expect(
      treasuryWithdrawHint({ invalidAmount: false, overBalance: true }),
    ).toMatch(/tesoreria|saldo/i);
  });
});

describe("growthInvestHint", () => {
  it("at cap", () => {
    expect(
      growthInvestHint({
        belowMin: false,
        shortCash: false,
        atCap: true,
        minLabel: "3.500 €",
      }),
    ).toMatch(/tetto|FL/i);
  });
  it("below min", () => {
    expect(
      growthInvestHint({
        belowMin: true,
        shortCash: false,
        atCap: false,
        minLabel: "3.500 €",
      }),
    ).toMatch(/3\.500/);
  });
});

describe("projectOfferAcceptHint", () => {
  it("null when can afford", () => {
    expect(projectOfferAcceptHint(true)).toBeNull();
  });
  it("cash when cannot", () => {
    expect(projectOfferAcceptHint(false)).toMatch(/cassa/i);
  });
});

describe("loanOfferHint", () => {
  it("passes through reason", () => {
    expect(loanOfferHint("Troppi mutui")).toBe("Troppi mutui");
  });
  it("null when free", () => {
    expect(loanOfferHint(null)).toBeNull();
  });
});
