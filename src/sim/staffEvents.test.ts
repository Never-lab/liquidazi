import { describe, expect, it } from "vitest";
import { createInitialGameState, toMonthIndex } from "./types";
import { hireEmployee } from "./actions";
import { tickStaffEvents } from "./staffEvents";
import { availableWorkforce } from "./workforce";

describe("staffEvents", () => {
  it("ferie estive riducono FL del 50% a luglio", () => {
    let s = createInitialGameState({ city: "058091", sector: "servizi" });
    s.calendar.month = 7;
    s.quietMode = false;
    s = tickStaffEvents(s);
    expect(availableWorkforce(s)).toBe(Math.round(30 * 0.5));
  });

  it("maternità azzera FL del dipendente", () => {
    let s = createInitialGameState({ city: "058091", sector: "servizi" });
    s = hireEmployee(s, "Operaio");
    s.employees[0]!.gender = "F";
    s.employees[0]!.absence = { kind: "maternita", monthsLeft: 6 };
    expect(availableWorkforce(s)).toBe(30);
  });

  it("paternità riduce FL del dipendente del 50%", () => {
    let s = createInitialGameState({ city: "058091", sector: "servizi" });
    s = hireEmployee(s, "Operaio");
    s.employees[0]!.gender = "M";
    s.employees[0]!.absence = { kind: "paternita", monthsLeft: 1 };
    expect(availableWorkforce(s)).toBe(30 + 2);
  });

  it("decrementa mesi assenza a fine mese", () => {
    let s = createInitialGameState({ city: "058091", sector: "servizi" });
    s = hireEmployee(s, "Operaio");
    s.employees[0]!.absence = { kind: "paternita", monthsLeft: 1 };
    s.quietMode = false;
    s = tickStaffEvents(s);
    expect(s.employees[0]!.absence).toBeUndefined();
  });

  it("malattia aziendale −15% nel mese attivo", () => {
    let s = createInitialGameState({ city: "058091", sector: "servizi" });
    const idx = toMonthIndex(s.calendar);
    s.workforceMalattiaMonthIdx = idx;
    expect(availableWorkforce(s)).toBe(Math.round(30 * 0.85));
  });
});
