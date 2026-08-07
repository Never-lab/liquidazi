import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { computeBalance, samplesFromSaves } from "./balance.mjs";
import { readdirSync, readFileSync, existsSync } from "node:fs";

describe("computeBalance", () => {
  it("returns zeros for empty runs", () => {
    expect(computeBalance([])).toMatchObject({ n: 0, avgMonths: 0, medianMonths: 0, live: 0 });
  });

  it("computes survival buckets and difficulty split", () => {
    const bal = computeBalance([
      { monthsPlayed: 2, peakCash: 100, peakDebt: 0, finalCash: -50, difficulty: "hard", outcome: "lost", sector: "servizi" },
      { monthsPlayed: 5, peakCash: 200, peakDebt: 50, finalCash: -10, difficulty: "normal", outcome: "lost", sector: "servizi" },
      { monthsPlayed: 12, peakCash: 500, peakDebt: 100, finalCash: 20, difficulty: "normal", outcome: "lost", sector: "commercio" },
      { monthsPlayed: 24, peakCash: 800, peakDebt: 0, finalCash: 300, difficulty: "easy", outcome: "won", sector: "commercio" },
    ]);
    expect(bal.n).toBe(4);
    expect(bal.medianMonths).toBe(8.5);
    expect(bal.avgMonths).toBe(10.8);
    expect(bal.pctGe12).toBe(50);
    expect(bal.pctGe24).toBe(25);
    expect(bal.wins).toBe(1);
    expect(bal.buckets).toEqual({ "1-3": 1, "4-6": 1, "7-12": 1, "13-23": 0, "24+": 1 });
    expect(bal.byDifficulty.normal).toMatchObject({ n: 2, pctGe12: 50 });
    expect(bal.bySector.servizi.n).toBe(2);
  });

  it("counts live outcomes separately from losses", () => {
    const bal = computeBalance([
      { monthsPlayed: 8, outcome: "live", difficulty: "normal" },
      { monthsPlayed: 3, outcome: "lost", difficulty: "normal" },
    ]);
    expect(bal.live).toBe(1);
    expect(bal.losses).toBe(1);
    expect(bal.medianMonths).toBe(5.5);
  });
});

describe("samplesFromSaves", () => {
  it("extracts running slots and skips finished", () => {
    const dir = mkdtempSync(join(tmpdir(), "liquidazi-saves-"));
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "u1.json"),
      JSON.stringify({
        slots: [
          {
            game: {
              monthsPlayed: 7,
              status: "running",
              difficulty: "normal",
              company: { sector: "servizi", cash: 1200 },
              career: { peakCash: 3000, peakDebt: 100 },
            },
          },
          {
            game: {
              monthsPlayed: 4,
              status: "lost",
              difficulty: "hard",
              company: { sector: "commercio", cash: -10 },
              career: { peakCash: 500, peakDebt: 200 },
            },
          },
        ],
      }),
    );
    const samples = samplesFromSaves(dir, { readdirSync, readFileSync, existsSync, join });
    expect(samples).toHaveLength(1);
    expect(samples[0]).toMatchObject({
      monthsPlayed: 7,
      outcome: "live",
      difficulty: "normal",
      sector: "servizi",
    });
    rmSync(dir, { recursive: true, force: true });
  });
});
