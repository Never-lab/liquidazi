import { describe, expect, it } from "vitest";
import { advanceMonth } from "./advanceMonth";
import { resolveEventOption, runWorldEvents } from "./eventCatalog";
import { createInitialGameState } from "./types";

describe("World events — pending + calendario", () => {
  it("pendingEvent blocca advanceMonth", () => {
    let s = createInitialGameState();
    s.quietMode = true;
    s.pendingEvent = {
      id: "consultant",
      title: "Test",
      body: "Scegli",
      options: [
        { id: "hire", label: "A" },
        { id: "skip", label: "B" },
      ],
    };
    const frozen = s.monthsPlayed;
    s = advanceMonth(s);
    expect(s.monthsPlayed).toBe(frozen);
    expect(s.pendingEvent?.id).toBe("consultant");
  });

  it("resolveEventOption applica e pulisce pending", () => {
    let s = createInitialGameState();
    s.company.cash = 20000;
    s.compliance = 70;
    s.pendingEvent = {
      id: "consultant",
      title: "Consulente",
      body: "…",
      options: [
        { id: "hire", label: "Paga" },
        { id: "skip", label: "No" },
      ],
    };
    s = resolveEventOption(s, "hire");
    expect(s.pendingEvent).toBeNull();
    expect(s.compliance).toBe(85);
    expect(s.company.cash).toBe(20000 - 1200);
  });

  it("calendario maggio lascia un log di reminder", () => {
    let s = createInitialGameState();
    s.quietMode = false;
    s.calendar = { month: 5, year: 2024 };
    s.monthsPlayed = 4;
    // Force skip world roll but calendar still runs: set skip by using easy + many rolls
    // runWorldEvents always applies calendar for month 5
    s = runWorldEvents(s);
    expect(s.log.some((e) => e.text.includes("Maggio"))).toBe(true);
  });

  it("calendario agosto colpisce la cassa", () => {
    let s = createInitialGameState();
    s.company.cash = 10000;
    s.calendar = { month: 8, year: 2024 };
    s.monthsPlayed = 7;
    const before = s.company.cash;
    s = runWorldEvents(s);
    expect(s.company.cash).toBeLessThan(before);
    expect(s.log.some((e) => e.text.includes("Agosto"))).toBe(true);
  });

  it("dopo resolve si può di nuovo avanzare il mese", () => {
    let s = createInitialGameState();
    s.quietMode = true;
    s.company.cash = 50000;
    s.pendingEvent = {
      id: "price_cut",
      title: "Prezzi",
      body: "…",
      options: [
        { id: "cut", label: "Sconta" },
        { id: "hold", label: "Tieni" },
      ],
    };
    s = resolveEventOption(s, "hold");
    expect(s.pendingEvent).toBeNull();
    const played = s.monthsPlayed;
    s = advanceMonth(s);
    expect(s.monthsPlayed).toBe(played + 1);
  });
});
