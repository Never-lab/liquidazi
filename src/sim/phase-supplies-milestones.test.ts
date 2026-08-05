import { describe, expect, it } from "vitest";
import { acceptOpportunity } from "./events";
import { maxDealNet } from "./events";
import { unlockMilestones } from "./milestones";
import { createInitialGameState } from "./types";

describe("Supplies + milestones", () => {
  it("fornitura alza supplyMonths; senza scorte ticket più basso", () => {
    let s = createInitialGameState({ city: "058091", sector: "servizi" });
    s.supplyMonths = 0;
    const low = maxDealNet(s);
    s.supplyMonths = 3;
    const high = maxDealNet(s);
    expect(high).toBeGreaterThan(low);

    s.opportunities = [
      {
        id: 1,
        kind: "supply",
        title: "Fornitura test",
        net: 400,
        expiresInMonths: 1,
        termMonths: 1,
      },
    ];
    s.supplyMonths = 3;
    s = acceptOpportunity(s, 1);
    expect(s.supplyMonths).toBe(4);
  });

  it("milestones: survive_12 e first_acquisition", () => {
    let s = createInitialGameState();
    s.monthsPlayed = 12;
    let r = unlockMilestones(s);
    expect(r.unlocked).toContain("survive_12");

    s = r.state;
    s.subsidiaries = [
      {
        id: 1,
        name: "X",
        sector: "servizi",
        monthlyEbitda: 100,
        capacityBonus: 0,
        monthsOwned: 1,
        risk: "low",
      },
    ];
    r = unlockMilestones(s);
    expect(r.unlocked).toContain("first_acquisition");
  });
});
