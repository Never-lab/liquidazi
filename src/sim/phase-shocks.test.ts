import { describe, expect, it } from "vitest";
import {
  comfortLevel,
  forcedShockCount,
  resolveEventOption,
  runWorldEvents,
} from "./eventCatalog";
import { createInitialGameState } from "./types";

describe("forced shocks", () => {
  it("pool shock ampio", () => {
    expect(forcedShockCount()).toBeGreaterThanOrEqual(18);
  });

  it("comfortLevel sale con cassa alta", () => {
    const s = createInitialGameState();
    s.monthsPlayed = 8;
    s.company.cash = 22000;
    expect(comfortLevel(s)).toBeGreaterThanOrEqual(2);
  });

  it("shock incendio toglie scorte", () => {
    let s = createInitialGameState();
    s.supplyMonths = 4;
    s.company.cash = 10000;
    s.pendingEvent = {
      id: "shock_fire",
      title: "Incendio",
      body: "…",
      options: [{ id: "ok", label: "Ok" }],
    };
    s = resolveEventOption(s, "ok");
    expect(s.pendingEvent).toBeNull();
    expect(s.supplyMonths).toBe(2);
    expect(s.company.cash).toBe(9500);
  });

  it("shock terremoto toglie 20% cassa", () => {
    let s = createInitialGameState();
    s.company.cash = 20000;
    s.pendingEvent = {
      id: "shock_quake",
      title: "Terremoto",
      body: "…",
      options: [{ id: "ok", label: "Ok" }],
    };
    s = resolveEventOption(s, "ok");
    expect(s.company.cash).toBe(16000);
  });

  it("shock fornitore azzera scorte", () => {
    let s = createInitialGameState();
    s.supplyMonths = 5;
    s.company.cash = 10000;
    s.pendingEvent = {
      id: "shock_supplier_bust",
      title: "Fornitore",
      body: "…",
      options: [{ id: "ok", label: "Ok" }],
    };
    s = resolveEventOption(s, "ok");
    expect(s.supplyMonths).toBe(0);
    expect(s.company.cash).toBe(9300);
  });

  it("shock cliente defaulta credito AR", () => {
    let s = createInitialGameState();
    s.company.reputation = 50;
    s.invoices = [
      {
        id: 1,
        kind: "AR",
        net: 3000,
        vat: 660,
        gross: 3660,
        dueIdx: 10,
        settled: false,
        defaulted: false,
        clientType: "private",
        issuedIdx: 5,
      },
    ];
    s.pendingEvent = {
      id: "shock_client_broke",
      title: "Cliente",
      body: "…",
      options: [{ id: "ok", label: "Ok" }],
    };
    s = resolveEventOption(s, "ok");
    expect(s.invoices[0]!.defaulted).toBe(true);
    expect(s.company.reputation).toBe(38);
  });

  it("con cassa comoda può comparire uno shock", () => {
    let hit = false;
    for (let m = 5; m < 80; m++) {
      let s = createInitialGameState();
      s.quietMode = false;
      s.company.cash = 25000;
      s.monthsPlayed = m;
      s.lastShockAt = null;
      s.calendar = { month: 3, year: 2024 };
      s.difficulty = "normal";
      s = runWorldEvents(s);
      if (s.pendingEvent?.id.startsWith("shock_")) {
        hit = true;
        expect(s.lastShockAt).toBe(m);
        break;
      }
    }
    expect(hit).toBe(true);
  });
});
