import { describe, expect, it } from "vitest";
import { PROJECTS } from "../config/projects";
import { acceptProject, tickActiveProject } from "./projects";
import { createInitialGameState } from "./types";

describe("acceptProject", () => {
  it("deducts cost and freezes cash, sets active project", () => {
    let s = createInitialGameState();
    s.company.cash = 20000;
    s.projectOffer = {
      year: 2025,
      options: ["magazzino", "formazione"],
    };

    const before = s.company.cash;
    s = acceptProject(s, "magazzino");
    const def = PROJECTS.magazzino;

    expect(s.activeProject).toEqual({
      id: "magazzino",
      monthsLeft: def.durationMonths,
      frozenCash: def.frozenCash,
    });
    expect(s.projectOffer).toBeNull();
    expect(s.company.cash).toBe(before - def.cost - def.frozenCash);
  });

  it("rejects when a project is already active", () => {
    let s = createInitialGameState();
    s.company.cash = 50000;
    s.activeProject = {
      id: "formazione",
      monthsLeft: 4,
      frozenCash: 0,
    };
    const cashBefore = s.company.cash;
    s = acceptProject(s, "digitalizzazione");
    expect(s.activeProject!.id).toBe("formazione");
    expect(s.company.cash).toBe(cashBefore);
  });

  it("rejects when cash is insufficient (cost + frozen)", () => {
    let s = createInitialGameState();
    const def = PROJECTS.magazzino;
    s.company.cash = def.cost + def.frozenCash - 1;
    const cashBefore = s.company.cash;
    s = acceptProject(s, "magazzino");
    expect(s.activeProject).toBeNull();
    expect(s.company.cash).toBe(cashBefore);
  });

  it("accepts project with zero frozen cash", () => {
    let s = createInitialGameState();
    s.company.cash = 10000;
    s = acceptProject(s, "formazione");
    expect(s.activeProject).toEqual({
      id: "formazione",
      monthsLeft: 6,
      frozenCash: 0,
    });
    expect(s.company.cash).toBe(5500);
  });
});

describe("tickActiveProject", () => {
  it("decrements monthsLeft while active", () => {
    let s = createInitialGameState();
    s.activeProject = {
      id: "formazione",
      monthsLeft: 3,
      frozenCash: 0,
    };
    s = tickActiveProject(s);
    expect(s.activeProject!.monthsLeft).toBe(2);
    expect(s.company.cash).toBe(10000);
  });

  it("clears at zero and returns frozen cash", () => {
    let s = createInitialGameState();
    s.company.cash = 5000;
    s.activeProject = {
      id: "magazzino",
      monthsLeft: 1,
      frozenCash: 2000,
    };
    s = tickActiveProject(s);
    expect(s.activeProject).toBeNull();
    expect(s.company.cash).toBe(7000);
  });

  it("no-op when no active project", () => {
    const s = createInitialGameState();
    const next = tickActiveProject(s);
    expect(next).toEqual(s);
  });
});
