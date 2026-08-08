import { describe, expect, it } from "vitest";
import { dueF24Total } from "./selectors";
import { pressureBand } from "./rival";
import { createTesterGameState } from "./testerSave";

describe("createTesterGameState", () => {
  it("builds a mid-game running save for admin tests", () => {
    const g = createTesterGameState();
    expect(g.status).toBe("running");
    expect(g.monthsPlayed).toBe(14);
    expect(g.company.name).toBe("Tester Mid SRL");
    expect(g.company.cash).toBe(18_000);
    expect(g.supplyMonths).toBe(2);
    expect(g.employees.length).toBe(3);
    expect(g.rival?.heat).toBe(55);
    expect(pressureBand(g.rival!.heat)).toBe("tesa");
    expect(dueF24Total(g)).toBeGreaterThan(0);
    expect(g.opportunities.length).toBeGreaterThan(0);
    expect(g.collectionCase).toBeNull();
  });
});
