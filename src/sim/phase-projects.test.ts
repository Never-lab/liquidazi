import { describe, expect, it } from "vitest";
import { fiscalYearSnapshot as snap } from "../config/fiscalYearSnapshot";
import { PROJECTS } from "../config/projects";
import { advanceMonth } from "./advanceMonth";
import { maxDealNet, monthlyCapacity } from "./events";
import {
  acceptProject,
  effectiveMonthlyRent,
  processActiveProjectForMonth,
  skipProjectOffer,
} from "./projects";
import { createInitialGameState } from "./types";

const decState = () => {
  let s = createInitialGameState();
  s.quietMode = true;
  s.calendar = { month: 12, year: 2024 };
  s.company.cash = 50000;
  s.monthsPlayed = 11;
  return s;
};

describe("annual project offer on Dec→Jan", () => {
  it("creates projectOffer with 2–3 options after closing December", () => {
    const s = advanceMonth(decState());
    expect(s.calendar).toEqual({ month: 1, year: 2025 });
    expect(s.projectOffer).not.toBeNull();
    expect(s.projectOffer!.year).toBe(2025);
    expect(s.projectOffer!.options.length).toBeGreaterThanOrEqual(2);
    expect(s.projectOffer!.options.length).toBeLessThanOrEqual(3);
    expect(new Set(s.projectOffer!.options).size).toBe(s.projectOffer!.options.length);
    expect(s.projectOfferYear).toBe(2025);
  });

  it("projectOffer blocks advanceMonth until resolved", () => {
    let s = advanceMonth(decState());
    expect(s.projectOffer).not.toBeNull();
    const played = s.monthsPlayed;
    s = advanceMonth(s);
    expect(s.monthsPlayed).toBe(played);
    expect(s.projectOffer).not.toBeNull();
  });

  it("accept sets active project, clears offer, deducts cash", () => {
    let s = advanceMonth(decState());
    const id = s.projectOffer!.options[0]!;
    const def = PROJECTS[id];
    const cashBefore = s.company.cash;
    s = acceptProject(s, id);
    expect(s.projectOffer).toBeNull();
    expect(s.activeProject).toEqual({
      id,
      monthsLeft: def.durationMonths,
      frozenCash: def.frozenCash,
    });
    expect(s.company.cash).toBe(cashBefore - def.cost - def.frozenCash);
  });

  it("skip clears offer without starting a project", () => {
    let s = advanceMonth(decState());
    expect(s.projectOffer).not.toBeNull();
    s = skipProjectOffer(s);
    expect(s.projectOffer).toBeNull();
    expect(s.activeProject).toBeNull();
  });

  it("after duration months project clears and returns frozen cash", () => {
    let s = decState();
    s.projectOffer = { year: 2025, options: ["magazzino"] };
    s = acceptProject(s, "magazzino");
    const def = PROJECTS.magazzino;
    const cashAfterAccept = s.company.cash;
    for (let i = 0; i < def.durationMonths; i++) {
      s = advanceMonth(s);
    }
    expect(s.activeProject).toBeNull();
    // One June diritto camerale (200 €) falls inside a 12-month span from Dec
    expect(s.company.cash).toBe(
      cashAfterAccept + def.frozenCash - snap.diritto_camerale_flat,
    );
    expect(s.log.some((e) => e.text.includes("Progetto completato"))).toBe(true);
  });
});

describe("active project effects", () => {
  it("digitalizzazione adds capacity bonus", () => {
    let s = createInitialGameState();
    s.quietMode = true;
    const base = monthlyCapacity(s);
    s.activeProject = { id: "digitalizzazione", monthsLeft: 6, frozenCash: 0 };
    expect(monthlyCapacity(s)).toBe(base + 1);
  });

  it("espansione_commerciale reduces capacity by slot penalty", () => {
    let s = createInitialGameState();
    s.quietMode = true;
    const base = monthlyCapacity(s);
    s.activeProject = { id: "espansione_commerciale", monthsLeft: 6, frozenCash: 0 };
    expect(monthlyCapacity(s)).toBe(Math.max(0, base - 1));
  });

  it("soft floor does not erase espansione slot penalty at minimal capacity", () => {
    let s = createInitialGameState();
    s.quietMode = true;
    s.company.reputation = 0;
    s.activeProject = { id: "espansione_commerciale", monthsLeft: 9, frozenCash: 0 };
    expect(monthlyCapacity(s)).toBe(0);
  });

  it("espansione_commerciale multiplies maxDealNet", () => {
    let s = createInitialGameState();
    s.quietMode = true;
    const base = maxDealNet(s);
    s.activeProject = { id: "espansione_commerciale", monthsLeft: 6, frozenCash: 0 };
    expect(maxDealNet(s)).toBeCloseTo(base * 1.06, 0);
  });

  it("espansione ticketMult applies after ceiling", () => {
    let s = createInitialGameState();
    s.quietMode = true;
    s.monthsPlayed = 120;
    for (let i = 0; i < 12; i++) {
      s.employees.push({
        id: i + 1,
        role: "Commerciale",
        grossMonthly: 2000,
        hireMonthIdx: 0,
        tfrAccrued: 0,
        senioritySteps: 0,
      });
    }
    s.upgradeLevels = { commerciale: 3, processi: 3 };
    const atCeiling = maxDealNet(s);
    s.activeProject = { id: "espansione_commerciale", monthsLeft: 9, frozenCash: 0 };
    expect(maxDealNet(s)).toBeCloseTo(atCeiling * 1.06, 0);
    expect(maxDealNet(s)).toBeGreaterThan(atCeiling);
  });

  it("magazzino lowers effective rent without mutating monthlyRent", () => {
    let s = createInitialGameState({ city: "058091", sector: "servizi" });
    s.company.monthlyRent = 1000;
    s.activeProject = { id: "magazzino", monthsLeft: 6, frozenCash: 0 };
    expect(effectiveMonthlyRent(s)).toBe(950);
    expect(s.company.monthlyRent).toBe(1000);
  });

  it("history costs use effective rent debited (magazzino discount)", () => {
    let s = createInitialGameState({ city: "058091", sector: "servizi" });
    s.quietMode = true;
    s.company.cash = 50000;
    s.company.monthlyRent = 1000;
    s.activeProject = { id: "magazzino", monthsLeft: 12, frozenCash: 2000 };
    const before = s.company.cash;
    s = advanceMonth(s);
    const rentCharged = before - s.company.cash;
    expect(rentCharged).toBe(950);
    const last = s.history[s.history.length - 1]!;
    expect(last.costs).toBeGreaterThanOrEqual(950);
    expect(last.costs).toBeLessThan(1000);
  });

  it("processActiveProjectForMonth applies compliance each month", () => {
    let s = createInitialGameState();
    s.compliance = 90;
    s.activeProject = { id: "formazione", monthsLeft: 2, frozenCash: 0 };
    s = processActiveProjectForMonth(s, 2024 * 12);
    expect(s.compliance).toBe(92);
    expect(s.activeProject!.monthsLeft).toBe(1);
  });
});
