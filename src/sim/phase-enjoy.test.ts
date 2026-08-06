import { describe, expect, it } from "vitest";
import { resolveEventOption, runWorldEvents } from "./eventCatalog";
import { declineOpportunity } from "./events";
import { pressureEffectBlurb, rollPressure } from "./pressures";
import { createInitialGameState } from "./types";
import { seedRival } from "./rival";

describe("enjoyability pass", () => {
  it("decline sale alza heat rivale", () => {
    let s = createInitialGameState();
    s.rival = { name: "TestRival", heat: 40 };
    s.opportunities = [
      {
        id: 1,
        kind: "sale",
        title: "Commessa · X",
        net: 500,
        expiresInMonths: 1,
        clientType: "private",
        termMonths: 1,
      },
    ];
    s = declineOpportunity(s, 1);
    expect(s.rival?.heat).toBe(42);
    expect(s.log[0]?.text).toMatch(/TestRival/);
  });

  it("rival_push resolve campagna abbassa heat", () => {
    let s = createInitialGameState();
    s.company.cash = 20000;
    s.rival = seedRival(s);
    s.rival.heat = 70;
    s.pendingEvent = {
      id: "rival_push",
      title: "Rival",
      body: "…",
      options: [
        { id: "campaign", label: "Campagna" },
        { id: "ignore", label: "Ignora" },
      ],
    };
    const heat0 = s.rival.heat;
    s = resolveEventOption(s, "campaign");
    expect(s.pendingEvent).toBeNull();
    expect(s.rival!.heat).toBeLessThan(heat0);
    expect(s.company.cash).toBe(20000 - 800);
  });

  it("pressureEffectBlurb è leggibile", () => {
    expect(pressureEffectBlurb("hiring_freeze")).toMatch(/assunzioni/i);
    expect(pressureEffectBlurb("cash_crunch")).toMatch(/Affitto/);
  });

  it("rollPressure log include effetto", () => {
    let s = createInitialGameState();
    s.calendar = { month: 1, year: 2026 };
    s.quietMode = false;
    s = rollPressure(s);
    expect(s.quarterPressure).not.toBeNull();
    expect(s.log[0]?.text).toMatch(/—/);
  });

  it("settembre lascia log di ripresa", () => {
    let s = createInitialGameState();
    s.calendar = { month: 9, year: 2024 };
    s.monthsPlayed = 8;
    s = runWorldEvents(s);
    expect(s.log.some((e) => e.text.includes("Settembre"))).toBe(true);
  });

  it("rival con heat alto può generare pending rival_push", () => {
    let hit = false;
    for (let m = 0; m < 60; m++) {
      let s = createInitialGameState();
      s.quietMode = false;
      s.rival = { name: "HotRival", heat: 95 };
      s.calendar = { month: 3, year: 2024 };
      s.monthsPlayed = m;
      s.difficulty = "hard";
      s = runWorldEvents(s);
      if (s.pendingEvent?.id === "rival_push") {
        hit = true;
        expect(s.pendingEvent.title).toMatch(/HotRival/);
        break;
      }
    }
    expect(hit).toBe(true);
  });
});
