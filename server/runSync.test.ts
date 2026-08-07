import { describe, expect, it } from "vitest";
import {
  extractRunFromGame,
  shouldTrackGame,
  syncRunsFromSaves,
  upsertRun,
} from "./runSync.mjs";

const user = { id: "u1", username: "alice" };
const newId = () => "id-" + Math.random().toString(16).slice(2, 8);

describe("shouldTrackGame / extractRunFromGame", () => {
  it("skips short running campaigns", () => {
    expect(
      shouldTrackGame({ monthsPlayed: 10, status: "running", career: {} }),
    ).toBe(false);
  });

  it("tracks lost, won, year2Reached, and months >= 24", () => {
    expect(shouldTrackGame({ monthsPlayed: 5, status: "lost" })).toBe(true);
    expect(shouldTrackGame({ monthsPlayed: 24, status: "won" })).toBe(true);
    expect(
      shouldTrackGame({
        monthsPlayed: 30,
        status: "running",
        career: { year2Reached: true },
      }),
    ).toBe(true);
    expect(
      shouldTrackGame({ monthsPlayed: 40, status: "running", career: {} }),
    ).toBe(true);
  });

  it("extracts long running save as won with monthsPlayed", () => {
    const run = extractRunFromGame(
      {
        monthsPlayed: 48,
        status: "running",
        difficulty: "normal",
        company: { name: "Long SRL", city: "058091", sector: "servizi", cash: 9000 },
        career: {
          year2Reached: true,
          peakCash: 12000,
          peakDebt: 100,
          lifetimeRevenue: 80000,
        },
      },
      user,
      1,
    );
    expect(run).toMatchObject({
      userId: "u1",
      username: "alice",
      monthsPlayed: 48,
      outcome: "won",
      slotIndex: 1,
      peakCash: 12000,
      finalCash: 9000,
      source: "save",
    });
  });
});

describe("upsertRun", () => {
  it("updates same slot when months grow past soft-win 24", () => {
    let runs = [];
    const first = upsertRun(
      runs,
      {
        userId: "u1",
        username: "alice",
        companyName: "A",
        city: "x",
        sector: "servizi",
        monthsPlayed: 24,
        peakCash: 1000,
        peakDebt: 0,
        lifetimeRevenue: 5000,
        finalCash: 800,
        difficulty: "normal",
        outcome: "won",
        slotIndex: 0,
        source: "end",
      },
      () => "r1",
    );
    runs = first.runs;
    expect(runs).toHaveLength(1);

    const second = upsertRun(
      runs,
      {
        userId: "u1",
        username: "alice",
        companyName: "A",
        city: "x",
        sector: "servizi",
        monthsPlayed: 60,
        peakCash: 5000,
        peakDebt: 0,
        lifetimeRevenue: 20000,
        finalCash: 4000,
        difficulty: "normal",
        outcome: "won",
        slotIndex: 0,
        source: "save",
      },
      () => "r2",
    );
    expect(second.runs).toHaveLength(1);
    expect(second.runs[0].monthsPlayed).toBe(60);
    expect(second.runs[0].id).toBe("r1");
    expect(second.upserted).toBe(true);
  });

  it("does not shrink monthsPlayed on stale save", () => {
    let runs = [
      {
        id: "r1",
        userId: "u1",
        username: "alice",
        monthsPlayed: 60,
        peakCash: 5000,
        peakDebt: 0,
        lifetimeRevenue: 20000,
        finalCash: 4000,
        outcome: "won",
        slotIndex: 0,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    const result = upsertRun(
      runs,
      {
        userId: "u1",
        username: "alice",
        companyName: "A",
        city: "x",
        sector: "servizi",
        monthsPlayed: 24,
        peakCash: 1000,
        peakDebt: 0,
        lifetimeRevenue: 5000,
        finalCash: 800,
        difficulty: "normal",
        outcome: "won",
        slotIndex: 0,
        source: "save",
      },
      newId,
    );
    expect(result.upserted).toBe(false);
    expect(result.runs[0].monthsPlayed).toBe(60);
  });
});

describe("syncRunsFromSaves", () => {
  it("backfills long save missing from runs.json", () => {
    const users = [user];
    const load = () => ({
      slots: [
        {
          game: {
            monthsPlayed: 55,
            status: "running",
            difficulty: "hard",
            company: { name: "Infinity", city: "RM", sector: "tech", cash: 2000 },
            career: {
              year2Reached: true,
              peakCash: 9000,
              peakDebt: 50,
              lifetimeRevenue: 40000,
            },
          },
        },
        { game: null },
        { game: null },
      ],
    });
    const out = syncRunsFromSaves(users, [], load, () => "new1");
    expect(out.synced).toBe(1);
    expect(out.touchedUsers).toBe(1);
    expect(out.runs[0].monthsPlayed).toBe(55);
    expect(out.runs[0].outcome).toBe("won");
  });
});
