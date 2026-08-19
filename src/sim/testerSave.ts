import { baseGrossFor } from "../config/staffPay";
import { DEFAULT_CITY_ID } from "../config/market";
import { generateOpportunities, seedNewGame } from "./events";
import { createInitialGameState, toMonthIndex, type GameState } from "./types";

/**
 * Mid-game save for admin playtests (Controllo → Installa save tester).
 * Normale, ~14 mesi, cassa/scorte/staff, rivale Tesa, F24 aperto, board fresco.
 */
export const createTesterGameState = (): GameState => {
  let g = createInitialGameState({
    name: "Tester Mid SRL",
    city: DEFAULT_CITY_ID,
    sector: "servizi",
    difficulty: "normal",
  });
  g = seedNewGame(g);

  g.monthsPlayed = 14;
  g.calendar = { month: 3, year: 2025 };
  const idx = toMonthIndex(g.calendar);

  g.company.cash = 18_000;
  g.company.reputation = 72;
  g.treasury = 0;
  g.portfolio = [
    {
      symbol: "XEON.MI",
      label: "Liquidità",
      shares: 40,
      avgCostEur: 100,
      assetClass: "etf",
      liquid: true,
      lastPriceEur: 100,
    },
  ];
  g.portfolioLegacyMigrated = true;
  g.supplyMonths = 2;
  g.supplyStock = [{ quality: 65, months: 2 }];
  g.compliance = 85;
  g.staffMorale = 68;
  g.monthsTaxOverdue = 0;
  g.collectionCase = null;
  g.monthsBelowZero = 0;
  g.status = "running";
  g.loseReason = null;
  g.demandRegime = "normale";
  g.lastShockAt = 10;
  g.ytd = {
    revenue: 42_000,
    purchases: 12_000,
    payrollCost: 18_000,
    interest: 200,
    otherCosts: 3_500,
    capitalGains: 0,
  };
  g.career = {
    peakCash: 24_000,
    peakDebt: 0,
    lifetimeRevenue: 95_000,
    submitted: false,
    year2Reached: true,
  };

  const hireIdx = idx - 8;
  g.employees = [
    {
      id: g.nextId++,
      role: "Operaio",
      grossMonthly: baseGrossFor("servizi", "Operaio"),
      hireMonthIdx: hireIdx,
      tfrAccrued: 800,
      senioritySteps: 0,
      gender: "M",
    },
    {
      id: g.nextId++,
      role: "Operaio",
      grossMonthly: baseGrossFor("servizi", "Operaio"),
      hireMonthIdx: hireIdx,
      tfrAccrued: 750,
      senioritySteps: 0,
      gender: "M",
    },
    {
      id: g.nextId++,
      role: "Impiegato",
      grossMonthly: baseGrossFor("servizi", "Impiegato"),
      hireMonthIdx: hireIdx + 2,
      tfrAccrued: 400,
      senioritySteps: 0,
      gender: "F",
    },
  ];

  g.rival = {
    name: g.rival?.name ?? "Rivale Tester",
    heat: 55,
  };

  g.liabilities = [
    {
      id: g.nextId++,
      kind: "IVA",
      amount: 920,
      dueIdx: idx,
      paid: false,
      penalized: false,
    },
    {
      id: g.nextId++,
      kind: "INPS",
      amount: 480,
      dueIdx: idx,
      paid: false,
      penalized: false,
    },
  ];

  const board = generateOpportunities(g, { forceRegime: "normale" });
  g.opportunities = board.ops;
  g.nextId = Math.max(g.nextId, board.nextId);
  g.demandRegime = board.demandRegime;
  g.log.unshift({
    id: g.nextId++,
    monthIdx: idx,
    tone: "neutral",
    text: "Save tester midgame: ~14 mesi, rivale Tesa, F24 aperto, scorte 2. Pronto per prove.",
  });
  g.log = g.log.slice(0, 12);
  g.history = [
    {
      monthIdx: idx,
      label: "Mar 2025",
      cash: g.company.cash,
      revenue: 0,
      costs: 0,
    },
  ];
  return g;
};
