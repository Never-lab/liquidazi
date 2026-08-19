import { describe, expect, it } from "vitest";
import { SICK_LEAVE_MAX_MONTHS_PER_YEAR } from "../config/staffAbsences";
import { createInitialGameState, toMonthIndex } from "./types";
import { hireEmployee } from "./actions";
import {
  applyStaffAbsence,
  tryQueueStaffEvent,
  tickStaffEvents,
} from "./staffEvents";
import { resolveEventOption } from "./eventCatalog";
import { availableWorkforce } from "./workforce";

describe("staffEvents", () => {
  it("ferie estive riducono FL del 50% a luglio", () => {
    let s = createInitialGameState({ city: "058091", sector: "servizi" });
    s.calendar.month = 7;
    s.quietMode = false;
    s = tickStaffEvents(s);
    expect(availableWorkforce(s)).toBe(Math.round(30 * 0.5));
    expect(s.lastEventPopup?.title).toBe("Ferie estive");
    expect(s.lastEventPopup?.family).toBe("personale");
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

  it("malattia individuale azzera FL del dipendente", () => {
    let s = createInitialGameState({ city: "058091", sector: "servizi" });
    s = hireEmployee(s, "Operaio");
    applyStaffAbsence(s, {
      employeeId: s.employees[0]!.id,
      kind: "malattia",
      months: 2,
    });
    expect(s.employees[0]!.absence?.kind).toBe("malattia");
    expect(s.employees[0]!.sickMonthsYtd).toBe(2);
    expect(availableWorkforce(s)).toBe(30);
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

  it("tryQueueStaffEvent imposta pending personale con staffTarget", () => {
    let s = createInitialGameState({ city: "058091", sector: "servizi" });
    s = hireEmployee(s, "Operaio");
    s.quietMode = false;
    const rand = () => 0;
    expect(tryQueueStaffEvent(s, rand)).toBe(true);
    expect(s.pendingEvent?.family).toBe("personale");
    expect(s.pendingEvent?.staffTarget?.employeeId).toBe(s.employees[0]!.id);
  });

  it("resolveEventOption applica assenza da staffTarget", () => {
    let s = createInitialGameState({ city: "058091", sector: "servizi" });
    s = hireEmployee(s, "Operaio");
    s.pendingEvent = {
      id: "staff_permesso",
      title: "Permesso",
      body: "test",
      family: "personale",
      staffTarget: {
        employeeId: s.employees[0]!.id,
        kind: "permesso",
        months: 1,
      },
      options: [{ id: "ok", label: "Ok" }],
    };
    s = resolveEventOption(s, "ok");
    expect(s.pendingEvent).toBeNull();
    expect(s.employees[0]!.absence?.kind).toBe("permesso");
  });

  it("malattia rispetta tetto annuo per dipendente", () => {
    let s = createInitialGameState({ city: "058091", sector: "servizi" });
    s = hireEmployee(s, "Operaio");
    s.employees[0]!.sickMonthsYtd = SICK_LEAVE_MAX_MONTHS_PER_YEAR;
    s.quietMode = false;
    const rand = () => 0;
    const hadMalattia = tryQueueStaffEvent(s, rand);
    if (hadMalattia && s.pendingEvent?.staffTarget?.kind === "malattia") {
      expect.fail("malattia non doveva essere proposta oltre il tetto");
    }
    expect(true).toBe(true);
  });

  it("reset sickMonthsYtd a gennaio", () => {
    let s = createInitialGameState({ city: "058091", sector: "servizi" });
    s = hireEmployee(s, "Operaio");
    s.employees[0]!.sickMonthsYtd = 4;
    s.calendar.month = 1;
    s.quietMode = false;
    s = tickStaffEvents(s);
    expect(s.employees[0]!.sickMonthsYtd).toBe(0);
  });
});
