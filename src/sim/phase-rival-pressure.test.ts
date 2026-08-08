import { describe, expect, it } from "vitest";
import {
  applyRivalSteal,
  pressureBand,
  pressureBandLabel,
  rivalCampaignCost,
  rivalPhase,
  tickRivalHeat,
  tickRivalPayoff,
} from "./rival";
import { createInitialGameState, type Opportunity } from "./types";

const sale = (id: number, title: string): Opportunity => ({
  id,
  kind: "sale",
  title,
  net: 1000,
  expiresInMonths: 1,
  clientType: "private",
  termMonths: 1,
});

const supply = (id: number): Opportunity => ({
  id,
  kind: "supply",
  title: "Fornitura · X",
  net: 500,
  expiresInMonths: 1,
  termMonths: 1,
});

describe("rival pressure helpers", () => {
  it("pressureBand thresholds", () => {
    expect(pressureBand(0)).toBe("calma");
    expect(pressureBand(39)).toBe("calma");
    expect(pressureBand(40)).toBe("tesa");
    expect(pressureBand(69)).toBe("tesa");
    expect(pressureBand(70)).toBe("guerra");
    expect(pressureBand(100)).toBe("guerra");
  });

  it("rivalPhase by monthsPlayed", () => {
    expect(rivalPhase(0)).toBe("arrivo");
    expect(rivalPhase(5)).toBe("arrivo");
    expect(rivalPhase(6)).toBe("caldo");
    expect(rivalPhase(17)).toBe("caldo");
    expect(rivalPhase(18)).toBe("resa");
  });

  it("labels Italian", () => {
    expect(pressureBandLabel("calma")).toBe("Calma");
    expect(pressureBandLabel("tesa")).toBe("Tesa");
    expect(pressureBandLabel("guerra")).toBe("Guerra");
  });

  it("rivalCampaignCost floor and scale", () => {
    expect(rivalCampaignCost(10000)).toBe(800);
    expect(rivalCampaignCost(50000)).toBe(2000);
  });
});

describe("applyRivalSteal bands", () => {
  it("Calma does not steal", () => {
    const s = createInitialGameState();
    s.quietMode = false;
    s.monthsPlayed = 10;
    s.rival = { name: "X", heat: 30 };
    s.opportunities = [sale(1, "A"), supply(2)];
    const next = applyRivalSteal(s);
    expect(next.opportunities.filter((o) => o.kind === "sale")).toHaveLength(1);
  });

  it("Arrivo never steals even at high heat", () => {
    const s = createInitialGameState();
    s.quietMode = false;
    s.monthsPlayed = 3;
    s.rival = { name: "X", heat: 90 };
    s.opportunities = [sale(1, "A"), sale(2, "B"), supply(3)];
    const next = applyRivalSteal(s);
    expect(next.opportunities.filter((o) => o.kind === "sale")).toHaveLength(2);
  });

  it("Guerra can steal two sales", () => {
    const base = createInitialGameState();
    base.quietMode = false;
    base.monthsPlayed = 10;
    base.rival = { name: "X", heat: 95 };
    let stoleTwo = false;
    for (let m = 0; m < 80; m++) {
      const s = {
        ...base,
        monthsPlayed: m,
        opportunities: [sale(1, "A"), sale(2, "B"), supply(3)],
        rival: { name: "X", heat: 95 },
        nextId: 10,
        log: [] as typeof base.log,
      };
      const next = applyRivalSteal(s);
      const salesLeft = next.opportunities.filter((o) => o.kind === "sale").length;
      if (salesLeft <= 0) {
        stoleTwo = true;
        expect(next.log.some((e) => /pressione/.test(e.text))).toBe(true);
        break;
      }
    }
    expect(stoleTwo).toBe(true);
  });

  it("contained rival does not steal", () => {
    const s = createInitialGameState();
    s.quietMode = false;
    s.monthsPlayed = 20;
    s.rival = { name: "X", heat: 90, contained: true };
    s.opportunities = [sale(1, "A"), sale(2, "B")];
    const next = applyRivalSteal(s);
    expect(next.opportunities.filter((o) => o.kind === "sale")).toHaveLength(2);
  });

  it("floor clamps heat after tick", () => {
    let s = createInitialGameState();
    s.rival = { name: "X", heat: 50, floor: 55 };
    s = tickRivalHeat(s, 10, 10);
    expect(s.rival!.heat).toBeGreaterThanOrEqual(55);
  });
});

describe("tickRivalPayoff", () => {
  it("contain at month 18 when heat low", () => {
    let s = createInitialGameState();
    s.monthsPlayed = 18;
    s.rival = { name: "X", heat: 30 };
    s = tickRivalPayoff(s);
    expect(s.rival?.contained).toBe(true);
  });

  it("anchor floor at month 18 when heat high", () => {
    let s = createInitialGameState();
    s.monthsPlayed = 18;
    s.rival = { name: "X", heat: 80 };
    s = tickRivalPayoff(s);
    expect(s.rival?.floor).toBe(55);
    s = tickRivalHeat(s, 10, 10);
    expect(s.rival!.heat).toBeGreaterThanOrEqual(55);
  });

  it("no payoff before month 18", () => {
    let s = createInitialGameState();
    s.monthsPlayed = 17;
    s.rival = { name: "X", heat: 30 };
    s = tickRivalPayoff(s);
    expect(s.rival?.contained).toBeUndefined();
    expect(s.rival?.floor).toBeUndefined();
  });
});
