import { describe, expect, it } from "vitest";
import {
  comfortLevel,
  coverNegativeCashFromTreasury,
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

  it("shock incendio a scorte zero aggiunge premium stockout", () => {
    let s = createInitialGameState();
    s.supplyMonths = 0;
    s.company.cash = 10000;
    s.pendingEvent = {
      id: "shock_fire",
      title: "Incendio",
      body: "…",
      options: [{ id: "ok", label: "Ok" }],
    };
    s = resolveEventOption(s, "ok");
    // base 500 + max(1600, round(10000*0.12)) = 500+1600
    expect(s.supplyMonths).toBe(0);
    expect(s.company.cash).toBe(7900);
    expect(s.ytd.otherCosts).toBe(2100);
  });

  it("shock fornitore già a zero: −700 + premium lost=2", () => {
    let s = createInitialGameState();
    s.supplyMonths = 0;
    s.company.cash = 10000;
    s.pendingEvent = {
      id: "shock_supplier_bust",
      title: "Fornitore",
      body: "…",
      options: [{ id: "ok", label: "Ok" }],
    };
    s = resolveEventOption(s, "ok");
    expect(s.supplyMonths).toBe(0);
    expect(s.company.cash).toBe(7700); // 700+1600
    expect(s.ytd.otherCosts).toBe(2300);
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

  it("con cassa comoda può scattare uno shock immediato senza pending", () => {
    let hit = false;
    for (let m = 5; m < 80; m++) {
      let s = createInitialGameState();
      s.quietMode = false;
      s.company.cash = 25000;
      s.treasury = 0;
      s.monthsPlayed = m;
      s.lastShockAt = null;
      s.calendar = { month: 3, year: 2024 };
      s.difficulty = "normal";
      s = runWorldEvents(s);
      if (s.lastShockAt === m) {
        hit = true;
        expect(s.pendingEvent).toBeNull();
        break;
      }
    }
    expect(hit).toBe(true);
  });

  it("shock pesca tesoreria se cassa va sotto zero", () => {
    let s = createInitialGameState();
    s.supplyMonths = 0;
    s.company.cash = 100;
    s.treasury = 2000;
    s.pendingEvent = {
      id: "shock_fire",
      title: "Incendio",
      body: "…",
      options: [{ id: "ok", label: "Ok" }],
    };
    s = resolveEventOption(s, "ok");
    // base 500 + stockout max(1600, ~12) = 2100 → cash −2000 covered by treasury
    expect(s.company.cash).toBe(0);
    expect(s.treasury).toBe(0);
  });

  it("una scelta ordinaria non pesca dalla tesoreria", () => {
    let s = createInitialGameState();
    s.company.cash = 100;
    s.treasury = 2000;
    s.pendingEvent = {
      id: "consultant",
      title: "Consulente",
      body: "…",
      options: [{ id: "hire", label: "Assumi" }],
    };
    s = resolveEventOption(s, "hire");
    expect(s.company.cash).toBe(-1100);
    expect(s.treasury).toBe(2000);
  });
});

describe("coverNegativeCashFromTreasury", () => {
  it("copre cassa negativa dalla tesoreria fino a zero", () => {
    const s = createInitialGameState();
    s.company.cash = -400;
    s.treasury = 1000;
    const taken = coverNegativeCashFromTreasury(s);
    expect(taken).toBe(400);
    expect(s.company.cash).toBe(0);
    expect(s.treasury).toBe(600);
    expect(s.log[0]?.text).toMatch(/Fondo emergenza/);
  });

  it("non tocca tesoreria se cassa non negativa", () => {
    const s = createInitialGameState();
    s.company.cash = 100;
    s.treasury = 500;
    expect(coverNegativeCashFromTreasury(s)).toBe(0);
    expect(s.treasury).toBe(500);
    expect(s.company.cash).toBe(100);
  });

  it("esauri tesoreria se insufficiente", () => {
    const s = createInitialGameState();
    s.company.cash = -800;
    s.treasury = 300;
    expect(coverNegativeCashFromTreasury(s)).toBe(300);
    expect(s.company.cash).toBe(-500);
    expect(s.treasury).toBe(0);
  });
});
