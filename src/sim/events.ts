import { cityById, pickCityInHomeRegion, pickCityOutsideHomeRegion } from "../config/market";
import { SECTOR_PROFILES } from "../config/sectorProfile";
import { DIFFICULTIES } from "../config/difficulty";
import { getProjectDef } from "../config/projects";
import { capacityPointsFor } from "../config/staffPay";
import { workforceRequiredForNet } from "../config/workforce";
import { supplyCapMonths, upgradeLevel } from "../config/upgrades";
import { migrateUpgradeState } from "./migrateUpgrades";
import { rng } from "./rng";
import {
  round2,
  toMonthIndex,
  type DemandRegime,
  type GameState,
  type Opportunity,
} from "./types";
import { issueCustomerInvoice, recordSupplierCost } from "./actions";
import { acceptAsContract, maybeMakeContract } from "./contracts";
import {
  canAcceptWorkforce,
  countRole,
  monthlyCapacity,
  workforceBlockHint,
} from "./workforce";
import {
  rollPressure,
  shouldRollPressure,
  ticketFactorFromPressure,
} from "./pressures";
import { applyRivalSteal, seedRival } from "./rival";
import {
  MUNICIPAL_NET_MAX,
  MUNICIPAL_NET_MIN,
  NATIONAL_NET_MAX,
  NATIONAL_NET_MIN,
  pickMarketLayer,
  repDemandMult,
} from "./reputation";

export { rng };

const CLIENT_NAMES = [
  "Rossi Snc", "Bianchi SRL", "Verdi & C.", "Neri Group", "Blu Servizi",
  "Gamma Soft", "Delta Trade", "Eta Logistica", "Studio Conti", "Bar Centrale",
];
const SUPPLIER_NAMES = [
  "Forniture Nord", "Materie Prime Spa", "Utenze+", "Magazzino Est", "Tech Supply",
];

/** Soft cap on board rows so UI stays readable. */
export const BOARD_MAX_OPS = 10;

/** Raised board soft-cap during boom demand months. */
export const BOARD_MAX_OPS_BOOM = 12;

/** Full-value staff capacity points before diminishing returns. */
export const STAFF_FULL_VALUE = 8;

export const rollDemandRegime = (rand: () => number): DemandRegime => {
  const u = rand();
  if (u < 0.2) return "secca";
  if (u < 0.8) return "normale";
  return "boom";
};

/** Edge-trigger: popup only when regime becomes secca/boom (not every repeat month). */
export const demandPopupForAdvance = (
  status: GameState["status"],
  prev: DemandRegime,
  next: DemandRegime,
): DemandRegime | null =>
  status === "running" && (next === "secca" || next === "boom") && next !== prev
    ? next
    : null;

export const regimeMult = (r: DemandRegime): number =>
  r === "secca" ? 0.15 : r === "boom" ? 1.35 : 1;

export const boardCapFor = (r: DemandRegime): number =>
  r === "boom" ? BOARD_MAX_OPS_BOOM : BOARD_MAX_OPS;

export const clampSaleTarget = (raw: number, r: DemandRegime): number => {
  const n = Math.round(raw);
  if (r === "secca") return Math.min(2, Math.max(0, n));
  if (r === "boom") return Math.min(12, Math.max(1, n));
  return Math.max(1, n);
};

const pick = <T,>(arr: T[], rand: () => number): T => arr[Math.floor(rand() * arr.length)]!;

const withWorkforceRequired = (op: Opportunity): Opportunity =>
  op.kind === "sale"
    ? { ...op, workforceRequired: workforceRequiredForNet(op.net) }
    : op;

/** Sum of per-role capacity points across all employees (legacy). */
export const staffCapacityPoints = (state: GameState): number =>
  state.employees.reduce((s, e) => s + capacityPointsFor(e.role), 0);

export { monthlyCapacity, countRole };

export const salesAcceptedThisMonth = (state: GameState): number => {
  const idx = toMonthIndex(state.calendar);
  return state.invoices.filter((i) => i.kind === "AR" && i.issuedIdx === idx).length;
};

/** Ticket ceiling grows a bit with staff; Impiegati raise it further; commerciale bumps further. Soft anti-exploit. */
const ticketCeiling = (state: GameState): number => {
  const upgradeLevels = migrateUpgradeState(state);
  const staff = state.employees.length;
  const impiegati = countRole(state, "Impiegato");
  const growthBump = Math.min(6000, (state.growthCapacityBonus ?? 0) * 2000);
  const base =
    18000 + Math.min(12000, staff * 800) + Math.min(6000, impiegati * 1200) + growthBump;
  const commercialeBump = [0, 4000, 6000, 8000][upgradeLevel(upgradeLevels, "commerciale")]!;
  return base + commercialeBump;
};

/**
 * Max deal size — sector base × seasonality × growth × reputation × competition.
 * Hard cap keeps spam-500k impossible.
 */
export const maxDealNet = (state: GameState): number => {
  const upgradeLevels = migrateUpgradeState(state);
  const profile = SECTOR_PROFILES[state.company.sector];
  const month = state.calendar.month;
  const season = profile.seasonality[month - 1] ?? 1;
  const months = Math.max(0, state.monthsPlayed);
  const staff = state.employees.length;
  const dens = state.company.densityIndex;
  const rep = 0.85 + (state.company.reputation / 100) * 0.35;
  const growth =
    1 +
    months * 0.04 +
    Math.min(staff, STAFF_FULL_VALUE) * 0.16 +
    Math.max(0, staff - STAFF_FULL_VALUE) * 0.05;
  const competition = dens > 1 ? Math.max(0.7, 1 - (dens - 1) * 0.12) : 1 + (1 - dens) * 0.08;
  const ticketMult = DIFFICULTIES[state.difficulty ?? "normal"].ticketMult;
  const commercialeMult = [1, 1.08, 1.12, 1.16][upgradeLevel(upgradeLevels, "commerciale")]!;
  const supplyMult = (state.supplyMonths ?? 0) > 0 ? 1 : 0.72;
  const pressureTicket = ticketFactorFromPressure(state);
  const capped = round2(
    Math.min(
      ticketCeiling(state),
      Math.max(
        350,
        profile.baseTicket *
          season *
          growth *
          rep *
          competition *
          ticketMult *
          commercialeMult *
          supplyMult *
          pressureTicket,
      ),
    ),
  );
  const projectTicketMult = state.activeProject
    ? getProjectDef(state.activeProject.id).ticketMult
    : 1;
  return round2(capped * projectTicketMult);
};

const pushSale = (
  ops: Opportunity[],
  state: GameState,
  profile: (typeof SECTOR_PROFILES)[keyof typeof SECTOR_PROFILES],
  cap: number,
  rand: () => number,
  id: number,
): number => {
  const layer = pickMarketLayer(
    state.company.repMunicipal ?? 0,
    state.company.repNational ?? 0,
    rand,
  );

  if (layer === "municipal") {
    const net = round2(
      MUNICIPAL_NET_MIN + rand() * (MUNICIPAL_NET_MAX - MUNICIPAL_NET_MIN),
    );
    const place = pickCityInHomeRegion(state.company.city, rand);
    const who = `${pick(["Comune", "ASL", "Provincia"], rand)} di ${place.label}`;
    ops.push(
      withWorkforceRequired({
        id,
        kind: "sale",
        title: `Appalto comunale · ${who}`,
        net,
        expiresInMonths: 1,
        clientType: "pa",
        termMonths: pick([6, 12, 12, 12], rand),
        marketLayer: "municipal",
      }),
    );
    return id + 1;
  }

  if (layer === "national") {
    const net = round2(
      NATIONAL_NET_MIN + rand() * (NATIONAL_NET_MAX - NATIONAL_NET_MIN),
    );
    const place = pickCityOutsideHomeRegion(state.company.city, rand);
    const who = pick(["Ministero", "Regione", "Università"], rand);
    ops.push(
      withWorkforceRequired({
        id,
        kind: "sale",
        title: `Appalto nazionale · ${who} · ${place.label}`,
        net,
        expiresInMonths: 1,
        clientType: "pa",
        termMonths: pick([24, 30, 36], rand),
        marketLayer: "national",
      }),
    );
    return id + 1;
  }

  const sizeFactor = 0.35 + rand() * 0.65;
  const net = round2(Math.max(300, Math.min(cap, cap * sizeFactor)));
  const termMonths = Math.min(3, pick(profile.privateTerms, rand));
  const home = cityById(state.company.city);
  const raw: Opportunity = {
    id,
    kind: "sale",
    title: `Commessa · ${pick(CLIENT_NAMES, rand)} · ${home.label}`,
    net,
    expiresInMonths: 1,
    clientType: "private",
    termMonths,
    marketLayer: "local",
  };
  ops.push(withWorkforceRequired(maybeMakeContract(raw, rand, state.company.reputation)));
  return id + 1;
};

const pushSupply = (
  ops: Opportunity[],
  cap: number,
  rand: () => number,
  id: number,
): number => {
  const sizeFactor = 0.35 + rand() * 0.65;
  const net = round2(Math.max(300, Math.min(cap, cap * sizeFactor)));
  const months = supplyMonthsFromNet(net);
  ops.push({
    id,
    kind: "supply",
    title: `Fornitura · ${pick(SUPPLIER_NAMES, rand)} · +${months} mesi`,
    net,
    expiresInMonths: 1,
    termMonths: 1,
  });
  return id + 1;
};

export const generateOpportunities = (
  state: GameState,
  opts?: { forceRegime?: DemandRegime },
): { ops: Opportunity[]; nextId: number; demandRegime: DemandRegime } => {
  const profile = SECTOR_PROFILES[state.company.sector];
  const rand = rng(toMonthIndex(state.calendar) * 997 + state.nextId * 13 + state.monthsPlayed);
  const upgradeLevels = migrateUpgradeState(state);
  const cap = maxDealNet(state);
  const capacity = monthlyCapacity(state);
  const commercialeBonus = upgradeLevel(upgradeLevels, "commerciale");
  const impiegati = countRole(state, "Impiegato");
  const regime = opts?.forceRegime ?? rollDemandRegime(rand);
  const jitter = Math.floor(rand() * 3) - 1; // -1, 0, +1
  const base = capacity + jitter + commercialeBonus + impiegati;
  const raw = base * regimeMult(regime) * repDemandMult(state.company.reputation);
  let saleTarget = clampSaleTarget(raw, regime);
  let supplyTarget = Math.max(0, Math.round(saleTarget * (0.28 + rand() * 0.1)));
  // Never soft-lock: if scorte are empty, always offer at least one supply.
  if ((state.supplyMonths ?? 0) <= 0) {
    supplyTarget = Math.max(1, supplyTarget);
  }
  const boardCap = boardCapFor(regime);
  const total = saleTarget + supplyTarget;
  if (total > boardCap) {
    const scale = boardCap / total;
    saleTarget = Math.round(saleTarget * scale);
    if (regime === "secca") {
      saleTarget = Math.min(2, Math.max(0, saleTarget));
    } else {
      saleTarget = Math.max(1, saleTarget);
    }
    supplyTarget = Math.max(
      (state.supplyMonths ?? 0) <= 0 ? 1 : 0,
      boardCap - saleTarget,
    );
    if (saleTarget + supplyTarget > boardCap) {
      saleTarget = boardCap - supplyTarget;
      if (regime === "secca") {
        saleTarget = Math.min(2, Math.max(0, saleTarget));
      }
    }
  }

  const ops: Opportunity[] = [];
  let id = state.nextId;
  for (let i = 0; i < saleTarget; i++) {
    id = pushSale(ops, state, profile, cap, rand, id);
  }
  for (let i = 0; i < supplyTarget; i++) {
    id = pushSupply(ops, cap, rand, id);
  }
  return { ops, nextId: id, demandRegime: regime };
};

/** Floor for emergency restock net (early-game). */
export const EMERGENCY_SUPPLY_FLOOR = 1500;

/** Months of coverage gained from a board supply offer. */
export const supplyMonthsFromNet = (net: number): number => (net >= 1200 ? 2 : 1);

/** Emergency restock cost: 10% of cash, never below floor. */
export const emergencySupplyNet = (state: GameState): number =>
  Math.max(EMERGENCY_SUPPLY_FLOOR, Math.round(state.company.cash * 0.1));

export const orderEmergencySupply = (state: GameState): GameState => {
  if ((state.supplyMonths ?? 0) > 0) return state;
  const cost = emergencySupplyNet(state);
  let next = recordSupplierCost(state, cost, 1);
  next = structuredClone(next);
  const cap = supplyCapMonths(migrateUpgradeState(next));
  next.supplyMonths = Math.min(cap, (next.supplyMonths ?? 0) + 2);
  next.log.unshift({
    id: next.nextId++,
    monthIdx: toMonthIndex(next.calendar),
    tone: "good",
    text: `Fornitura d'emergenza ordinata · ${cost.toLocaleString("it-IT")} € + IVA. Scorte ${next.supplyMonths} mesi.`,
  });
  next.log = next.log.slice(0, 12);
  return next;
};

export const acceptOpportunity = (state: GameState, opportunityId: number): GameState => {
  const op = state.opportunities.find((o) => o.id === opportunityId);
  if (!op) return state;

  const saleFl =
    op.kind === "sale" ? (op.workforceRequired ?? workforceRequiredForNet(op.net)) : 0;

  if (op.kind === "sale" && op.contractMonths && op.contractMonths >= 2) {
    if ((state.activeContracts ?? []).length >= 2) {
      const blocked = structuredClone(state);
      blocked.lastUiHint = {
        text: "Hai già 2 contratti attivi: chiudine uno prima di firmarne un altro.",
        tone: "bad",
      };
      return blocked;
    }
    if (!canAcceptWorkforce(state, saleFl)) {
      const blocked = structuredClone(state);
      blocked.lastUiHint = {
        text: workforceBlockHint(state, saleFl),
        tone: "bad",
      };
      return blocked;
    }
    const asContract = acceptAsContract(state, op);
    return asContract ?? state;
  }

  if (op.kind === "sale" && !canAcceptWorkforce(state, saleFl)) {
    const blocked = structuredClone(state);
    blocked.lastUiHint = {
      text: workforceBlockHint(state, saleFl),
      tone: "bad",
    };
    return blocked;
  }

  if (op.kind === "supply") {
    const add = supplyMonthsFromNet(op.net);
    const cap = supplyCapMonths(migrateUpgradeState(state));
    if ((state.supplyMonths ?? 0) + add > cap) {
      const blocked = structuredClone(state);
      blocked.lastUiHint = {
        text: `Magazzino pieno (max ${cap} mesi). Potenzia Magazzino scorte o consuma scorte prima di ordinare.`,
        tone: "bad",
      };
      return blocked;
    }
  }

  let next =
    op.kind === "sale"
      ? issueCustomerInvoice(state, op.net, {
          clientType: op.clientType ?? "private",
          termMonths: op.termMonths,
          marketLayer: op.marketLayer ?? (op.clientType === "pa" ? "municipal" : "local"),
          workforceRequired: saleFl,
        })
      : recordSupplierCost(state, op.net, op.termMonths);
  next = structuredClone(next);
  next.opportunities = next.opportunities.filter((o) => o.id !== opportunityId);
  if (op.kind !== "sale") {
    next.supplyMonths = Math.min(
      supplyCapMonths(migrateUpgradeState(next)),
      (next.supplyMonths ?? 0) + supplyMonthsFromNet(op.net),
    );
  }
  const termNote =
    op.kind === "sale"
      ? op.clientType === "pa"
        ? ` PA, pagamento ~${op.termMonths} mesi`
        : ` pagamento ${op.termMonths} mese/i`
      : "";
  next.log.unshift({
    id: next.nextId++,
    monthIdx: toMonthIndex(next.calendar),
    tone: "good",
    text:
      op.kind === "sale"
        ? `Accettata ${op.title} · ${op.net.toLocaleString("it-IT")} € + IVA.${termNote}`
        : `Ordinata ${op.title} · ${op.net.toLocaleString("it-IT")} € + IVA. Scorte ${next.supplyMonths} mesi.`,
  });
  next.log = next.log.slice(0, 12);
  return next;
};

export const declineOpportunity = (state: GameState, opportunityId: number): GameState => {
  const next = structuredClone(state);
  const op = next.opportunities.find((o) => o.id === opportunityId);
  if (!op) return state;
  next.opportunities = next.opportunities.filter((o) => o.id !== opportunityId);
  if (op.kind === "sale" && next.rival) {
    next.rival = {
      ...next.rival,
      heat: Math.min(100, next.rival.heat + 2),
    };
  }
  next.log.unshift({
    id: next.nextId++,
    monthIdx: toMonthIndex(next.calendar),
    tone: "neutral",
    text:
      op.kind === "sale" && next.rival
        ? `Lasciata scadere: ${op.title}. ${next.rival.name} guadagna spazio (pressione ${Math.round(next.rival.heat)}).`
        : `Lasciata scadere: ${op.title}.`,
  });
  next.log = next.log.slice(0, 12);
  return next;
};

export const seedNewGame = (state: GameState): GameState => {
  let next = structuredClone(state);
  next.rival = seedRival(next);
  next.quarterPressure = null;
  next.activeContracts = [];
  if (!next.quietMode && shouldRollPressure(next)) {
    next = rollPressure(next);
  }
  const { ops, nextId, demandRegime } = generateOpportunities(next);
  next.opportunities = ops;
  next.nextId = Math.max(next.nextId, nextId);
  next.demandRegime = demandRegime;
  next = applyRivalSteal(next);
  next.log = [
    {
      id: next.nextId++,
      monthIdx: toMonthIndex(next.calendar),
      tone: "neutral" as const,
      text: `Azienda aperta. Rivale locale: ${next.rival?.name ?? "—"}. PA paga tardi; i privati a volte non pagano.`,
    },
    ...next.log.slice(0, 11),
  ].slice(0, 12);
  next.history = [
    {
      monthIdx: toMonthIndex(next.calendar),
      label: `${next.calendar.month}/${next.calendar.year}`,
      cash: next.company.cash,
      revenue: 0,
      costs: 0,
    },
  ];
  next.quietMode = false;
  return next;
};

export const refreshMarketBoard = (state: GameState): GameState => {
  let next = structuredClone(state);
  const { ops, nextId, demandRegime } = generateOpportunities(next);
  next.opportunities = ops;
  next.nextId = Math.max(next.nextId, nextId);
  next.demandRegime = demandRegime;
  next = applyRivalSteal(next);
  return next;
};
