import { describe, expect, it } from "vitest";
import { createInitialGameState } from "./types";
import {
  MILESTONE_DEFS,
  milestoneLabel,
  nextObjectives,
  platinumProgress,
  unlockMilestones,
} from "./milestones";

describe("milestones catalog v2", () => {
  it("includes early mid and platino expansions", () => {
    const ids = MILESTONE_DEFS.map((d) => d.id);
    expect(ids).toContain("first_invoice");
    expect(ids).toContain("first_hire");
    expect(ids).toContain("staff_5");
    expect(ids).toContain("survive_24");
    expect(ids).toContain("survive_36");
    expect(ids).toContain("holding_6");
    expect(MILESTONE_DEFS.length).toBeGreaterThanOrEqual(20);
  });

  it("nextObjectives returns up to 3 incomplete in catalog order", () => {
    const s = createInitialGameState();
    const next = nextObjectives(s, 3);
    expect(next).toHaveLength(3);
    expect(next.every((m) => !m.done)).toBe(true);
    expect(next[0]!.id).toBe("first_invoice");
  });

  it("unlocks first_invoice when AR exists", () => {
    const s = createInitialGameState();
    s.invoices = [
      {
        id: 1,
        kind: "AR",
        net: 1000,
        vat: 220,
        gross: 1220,
        issuedIdx: 2024 * 12,
        dueIdx: 2024 * 12 + 1,
        settled: false,
        clientType: "private",
      },
    ];
    const r = unlockMilestones(s);
    expect(r.unlocked).toContain("first_invoice");
    expect(r.state.milestones).toContain("first_invoice");
  });

  it("unlocks first_hire and staff_5 from headcount", () => {
    const s = createInitialGameState();
    s.employees = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      role: "Operaio" as const,
      grossMonthly: 1800,
      hireMonthIdx: 2024 * 12,
      senioritySteps: 0,
      tfrAccrued: 0,
    }));
    const r = unlockMilestones(s);
    expect(r.unlocked).toContain("first_hire");
    expect(r.unlocked).toContain("staff_5");
  });

  it("unlocks cash and holding platino thresholds", () => {
    const s = createInitialGameState();
    s.career.peakCash = 100_000;
    s.subsidiaries = Array.from({ length: 6 }, (_, i) => ({
      id: i + 1,
      name: `S${i}`,
      sector: "servizi" as const,
      monthlyEbitda: 100,
      capacityBonus: 0,
      monthsOwned: 1,
      risk: "low" as const,
      purchasePrice: 1000,
      listedUntilMonthIdx: null,
      capexCooldownMonths: 0,
    }));
    const r = unlockMilestones(s);
    expect(r.unlocked).toContain("cash_25k");
    expect(r.unlocked).toContain("cash_100k");
    expect(r.unlocked).toContain("holding_3");
    expect(r.unlocked).toContain("holding_6");
    expect(r.unlocked).toContain("first_acquisition");
  });

  it("unlocks first_f24 when a liability is paid", () => {
    const s = createInitialGameState();
    s.liabilities = [
      {
        id: 1,
        kind: "IVA",
        amount: 100,
        dueIdx: 2024 * 12,
        paid: true,
        penalized: false,
      },
    ];
    expect(unlockMilestones(s).unlocked).toContain("first_f24");
  });

  it("unlocks first_month_profit on positive last close", () => {
    const s = createInitialGameState();
    s.monthsPlayed = 1;
    s.lastCloseSummary = {
      cashBefore: 10000,
      cashAfter: 10500,
      delta: 500,
      lines: [],
    };
    expect(unlockMilestones(s).unlocked).toContain("first_month_profit");
  });

  it("unlocks survive_24 when year2Reached", () => {
    const s = createInitialGameState();
    s.career.year2Reached = true;
    expect(unlockMilestones(s).unlocked).toContain("survive_24");
  });

  it("platinumProgress counts unlocked account ids", () => {
    const p = platinumProgress(["first_invoice", "first_f24"]);
    expect(p.total).toBe(MILESTONE_DEFS.length);
    expect(p.done).toBe(2);
    expect(p.pct).toBe(Math.round((2 / MILESTONE_DEFS.length) * 100));
  });

  it("milestoneLabel resolves Italian labels", () => {
    expect(milestoneLabel("first_invoice")).toMatch(/fattura/i);
    expect(milestoneLabel("staff_10")).toMatch(/10/);
  });
});
