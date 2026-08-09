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
  it("includes early and survive_24 defs", () => {
    const ids = MILESTONE_DEFS.map((d) => d.id);
    expect(ids).toContain("first_invoice");
    expect(ids).toContain("first_f24");
    expect(ids).toContain("first_month_profit");
    expect(ids).toContain("survive_24");
    expect(ids).toContain("survive_12");
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
  });
});
