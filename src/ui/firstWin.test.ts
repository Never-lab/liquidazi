import { describe, expect, it } from "vitest";
import { createInitialGameState } from "../sim/types";
import {
  FIRST_WIN_TOAST_AR,
  FIRST_WIN_TOAST_DONE,
  firstWinProgress,
  isFirstArAccept,
  markFirstWinCelebrated,
  shouldCelebrateFirstWin,
} from "./firstWin";

const sampleAr = {
  id: 1,
  kind: "AR" as const,
  net: 1000,
  vat: 220,
  gross: 1220,
  issuedIdx: 2024 * 12,
  dueIdx: 2024 * 12 + 1,
  settled: false,
  clientType: "private" as const,
};

describe("firstWinProgress", () => {
  it("starts with all steps incomplete", () => {
    const s = createInitialGameState();
    const p = firstWinProgress(s);
    expect(p.acceptedSale).toBe(false);
    expect(p.closedMonth).toBe(false);
    expect(p.paidF24).toBe(false);
    expect(p.complete).toBe(false);
    expect(p.steps.map((x) => x.done)).toEqual([false, false, false]);
    expect(p.steps.map((x) => x.label)).toEqual([
      "Accetta una vendita dal tabellone",
      "Chiudi il mese",
      "Paga l'F24",
    ]);
  });

  it("marks accept after first AR invoice", () => {
    const s = createInitialGameState();
    s.invoices = [sampleAr];
    const p = firstWinProgress(s);
    expect(p.acceptedSale).toBe(true);
    expect(p.closedMonth).toBe(false);
    expect(p.steps[0]!.done).toBe(true);
  });

  it("marks close after monthsPlayed >= 1", () => {
    const s = createInitialGameState();
    s.monthsPlayed = 1;
    expect(firstWinProgress(s).closedMonth).toBe(true);
  });

  it("marks F24 when a liability is paid", () => {
    const s = createInitialGameState();
    s.monthsPlayed = 1;
    s.liabilities = [
      {
        id: 1,
        kind: "IVA",
        amount: 100,
        dueIdx: 2024 * 12 + 1,
        paid: true,
        penalized: false,
      },
    ];
    expect(firstWinProgress(s).paidF24).toBe(true);
  });

  it("is complete when all three are done", () => {
    const s = createInitialGameState();
    s.monthsPlayed = 1;
    s.invoices = [sampleAr];
    s.liabilities = [
      {
        id: 1,
        kind: "IVA",
        amount: 100,
        dueIdx: 2024 * 12 + 1,
        paid: true,
        penalized: false,
      },
    ];
    expect(firstWinProgress(s).complete).toBe(true);
  });
});

describe("first-win toasts", () => {
  it("detects first AR accept", () => {
    const before = createInitialGameState();
    const after = createInitialGameState();
    after.invoices = [sampleAr];
    expect(isFirstArAccept(before, after)).toBe(true);
    expect(isFirstArAccept(after, after)).toBe(false);
    expect(FIRST_WIN_TOAST_AR).toMatch(/fattura/i);
  });

  it("celebrates first win once when F24 paid after sale + close", () => {
    const before = createInitialGameState();
    before.monthsPlayed = 1;
    before.invoices = [sampleAr];
    before.liabilities = [
      {
        id: 1,
        kind: "IVA",
        amount: 100,
        dueIdx: 2024 * 12,
        paid: false,
        penalized: false,
      },
    ];
    const after = structuredClone(before);
    after.liabilities[0]!.paid = true;
    after.company.cash -= 100;
    expect(shouldCelebrateFirstWin(before, after, 100)).toBe(true);
    const marked = markFirstWinCelebrated(after);
    expect(marked.career.firstWinCelebrated).toBe(true);
    expect(shouldCelebrateFirstWin(marked, marked, 100)).toBe(false);
    expect(FIRST_WIN_TOAST_DONE).toMatch(/ciclo completo/i);
  });
});
