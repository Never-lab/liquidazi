import { SECTOR_PROFILES } from "../config/sectorProfile";
import { DIFFICULTIES } from "../config/difficulty";
import { hasUpgrade } from "../config/upgrades";
import { rng } from "./rng";
import {
  round2,
  toMonthIndex,
  type ClientType,
  type GameState,
  type Opportunity,
} from "./types";
import { issueCustomerInvoice, recordSupplierCost } from "./actions";
import { acceptAsContract, contractSlotsUsed, maybeMakeContract } from "./contracts";
import {
  capacityPressurePenalty,
  paChanceBoost,
  rollPressure,
  shouldRollPressure,
  ticketFactorFromPressure,
} from "./pressures";
import { applyRivalSteal, seedRival } from "./rival";

export { rng };

const CLIENT_NAMES = [
  "Rossi Snc", "Bianchi SRL", "Verdi & C.", "Neri Group", "Blu Servizi",
  "Gamma Soft", "Delta Trade", "Eta Logistica", "Studio Conti", "Bar Centrale",
];
const PA_NAMES = [
  "Comune", "ASL", "Università", "Provincia", "Ministero (appalto)",
];
const SUPPLIER_NAMES = [
  "Forniture Nord", "Materie Prime Spa", "Utenze+", "Magazzino Est", "Tech Supply",
];

/** Soft cap on board rows so UI stays readable. */
export const BOARD_MAX_OPS = 10;

/** Full-value staff headcount before diminishing returns. */
const STAFF_FULL_VALUE = 6;

const pick = <T,>(arr: T[], rand: () => number): T => arr[Math.floor(rand() * arr.length)]!;

/**
 * Sale slots / month. First 6 employees count 1:1; extras count 1/3.
 * Processi upgrade adds +1 without headcount.
 */
export const monthlyCapacity = (state: GameState): number => {
  const staff = state.employees.length;
  const core = Math.min(staff, STAFF_FULL_VALUE);
  const extra = Math.max(0, staff - STAFF_FULL_VALUE);
  const repBonus = Math.floor(state.company.reputation / 40);
  const processi = hasUpgrade(state.upgrades, "processi") ? 1 : 0;
  const temp = (state.tempCapacityMonths ?? 0) > 0 ? 1 : 0;
  const growth = state.growthCapacityBonus ?? 0;
  const subCap = (state.subsidiaries ?? []).reduce((s, sub) => s + sub.capacityBonus, 0);
  const base =
    1 + core + Math.floor(extra / 3) + repBonus + processi + temp + growth + subCap;
  return Math.max(0, base - contractSlotsUsed(state) - capacityPressurePenalty(state));
};

export const salesAcceptedThisMonth = (state: GameState): number => {
  const idx = toMonthIndex(state.calendar);
  return state.invoices.filter((i) => i.kind === "AR" && i.issuedIdx === idx).length;
};

/** Ticket ceiling grows a bit with staff; commerciale bumps further. Soft anti-exploit. */
const ticketCeiling = (state: GameState): number => {
  const staff = state.employees.length;
  const growthBump = Math.min(6000, (state.growthCapacityBonus ?? 0) * 2000);
  const base = 18000 + Math.min(12000, staff * 800) + growthBump;
  return hasUpgrade(state.upgrades, "commerciale") ? base + 4000 : base;
};

/**
 * Max deal size — sector base × seasonality × growth × reputation × competition.
 * Hard cap keeps spam-500k impossible.
 */
export const maxDealNet = (state: GameState): number => {
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
  const commerciale = hasUpgrade(state.upgrades, "commerciale") ? 1.08 : 1;
  const supplyMult = (state.supplyMonths ?? 0) > 0 ? 1 : 0.72;
  const pressureTicket = ticketFactorFromPressure(state);
  return round2(
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
          commerciale *
          supplyMult *
          pressureTicket,
      ),
    ),
  );
};

const pushSale = (
  ops: Opportunity[],
  state: GameState,
  profile: (typeof SECTOR_PROFILES)[keyof typeof SECTOR_PROFILES],
  cap: number,
  rand: () => number,
  id: number,
): number => {
  const sizeFactor = 0.35 + rand() * 0.65;
  const net = round2(Math.max(300, Math.min(cap, cap * sizeFactor)));
  const isPa = rand() < profile.paChance + paChanceBoost(state);
  const clientType: ClientType = isPa ? "pa" : "private";
  const termMonths = pick(isPa ? profile.paTerms : profile.privateTerms, rand);
  const who = isPa
    ? `${pick(PA_NAMES, rand)} di ${state.company.city}`
    : pick(CLIENT_NAMES, rand);
  const raw: Opportunity = {
    id,
    kind: "sale",
    title: isPa ? `Appalto PA · ${who}` : `Commessa · ${who}`,
    net,
    expiresInMonths: 1,
    clientType,
    termMonths,
  };
  ops.push(maybeMakeContract(raw, rand));
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
  ops.push({
    id,
    kind: "supply",
    title: `Fornitura · ${pick(SUPPLIER_NAMES, rand)}`,
    net,
    expiresInMonths: 1,
    termMonths: 1,
  });
  return id + 1;
};

export const generateOpportunities = (
  state: GameState,
): { ops: Opportunity[]; nextId: number } => {
  const profile = SECTOR_PROFILES[state.company.sector];
  const rand = rng(toMonthIndex(state.calendar) * 997 + state.nextId * 13 + state.monthsPlayed);
  const cap = maxDealNet(state);
  const capacity = monthlyCapacity(state);
  const commercialeBonus = hasUpgrade(state.upgrades, "commerciale") ? 1 : 0;
  const jitter = Math.floor(rand() * 3) - 1; // -1, 0, +1
  let saleTarget = Math.max(1, capacity + jitter + commercialeBonus);
  let supplyTarget = Math.max(0, Math.round(saleTarget * (0.28 + rand() * 0.1)));
  const total = saleTarget + supplyTarget;
  if (total > BOARD_MAX_OPS) {
    const scale = BOARD_MAX_OPS / total;
    saleTarget = Math.max(1, Math.round(saleTarget * scale));
    supplyTarget = Math.max(0, BOARD_MAX_OPS - saleTarget);
  }

  const ops: Opportunity[] = [];
  let id = state.nextId;
  for (let i = 0; i < saleTarget; i++) {
    id = pushSale(ops, state, profile, cap, rand, id);
  }
  for (let i = 0; i < supplyTarget; i++) {
    id = pushSupply(ops, cap, rand, id);
  }
  return { ops, nextId: id };
};

export const acceptOpportunity = (state: GameState, opportunityId: number): GameState => {
  const op = state.opportunities.find((o) => o.id === opportunityId);
  if (!op) return state;
  const cap = maxDealNet(state);
  if (op.net > cap + 0.01) return state;

  if (op.kind === "sale" && op.contractMonths && op.contractMonths >= 2) {
    if (salesAcceptedThisMonth(state) >= monthlyCapacity(state)) {
      const blocked = structuredClone(state);
      blocked.log.unshift({
        id: blocked.nextId++,
        monthIdx: toMonthIndex(blocked.calendar),
        tone: "bad",
        text: `Capacità piena: non puoi bloccare uno slot contratto.`,
      });
      blocked.log = blocked.log.slice(0, 12);
      return blocked;
    }
    const asContract = acceptAsContract(state, op);
    return asContract ?? state;
  }

  if (op.kind === "sale" && salesAcceptedThisMonth(state) >= monthlyCapacity(state)) {
    const blocked = structuredClone(state);
    blocked.log.unshift({
      id: blocked.nextId++,
      monthIdx: toMonthIndex(blocked.calendar),
      tone: "bad",
      text: `Capacità piena (${monthlyCapacity(state)} commesse/mese). Assumi con giudizio: oltre 6 dipendenti rendono meno.`,
    });
    blocked.log = blocked.log.slice(0, 12);
    return blocked;
  }

  let next =
    op.kind === "sale"
      ? issueCustomerInvoice(state, op.net, {
          clientType: op.clientType ?? "private",
          termMonths: op.termMonths,
        })
      : recordSupplierCost(state, op.net, op.termMonths);
  next = structuredClone(next);
  next.opportunities = next.opportunities.filter((o) => o.id !== opportunityId);
  if (op.kind === "sale") {
    next.company.reputation = Math.min(100, next.company.reputation + 1);
  } else {
    // Supply builds coverage (cap 6 months)
    next.supplyMonths = Math.min(6, (next.supplyMonths ?? 0) + (op.net >= 1200 ? 2 : 1));
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
  next.log.unshift({
    id: next.nextId++,
    monthIdx: toMonthIndex(next.calendar),
    tone: "neutral",
    text: `Lasciata scadere: ${op.title}.`,
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
  const { ops, nextId } = generateOpportunities(next);
  next.opportunities = ops;
  next.nextId = Math.max(next.nextId, nextId);
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
  const { ops, nextId } = generateOpportunities(next);
  next.opportunities = ops;
  next.nextId = Math.max(next.nextId, nextId);
  next = applyRivalSteal(next);
  return next;
};
