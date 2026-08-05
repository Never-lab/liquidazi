import { SECTOR_PROFILES } from "../config/sectorProfile";
import { DIFFICULTIES } from "../config/difficulty";
import { marketModifiersFromIndex } from "./market";
import {
  round2,
  toMonthIndex,
  type ClientType,
  type GameState,
  type Opportunity,
} from "./types";
import { issueCustomerInvoice, recordSupplierCost } from "./actions";

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

/** Deterministic PRNG from seed (mulberry32). */
export const rng = (seed: number): (() => number) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const pick = <T,>(arr: T[], rand: () => number): T => arr[Math.floor(rand() * arr.length)]!;

/** How many sale deals you can take this month. */
export const monthlyCapacity = (state: GameState): number =>
  1 + state.employees.length + Math.floor(state.company.reputation / 40);

export const salesAcceptedThisMonth = (state: GameState): number => {
  const idx = toMonthIndex(state.calendar);
  return state.invoices.filter((i) => i.kind === "AR" && i.issuedIdx === idx).length;
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
  const growth = 1 + months * 0.04 + staff * 0.16;
  const competition = dens > 1 ? Math.max(0.7, 1 - (dens - 1) * 0.12) : 1 + (1 - dens) * 0.08;
  const ticketMult = DIFFICULTIES[state.difficulty ?? "normal"].ticketMult;
  return round2(
    Math.min(
      18000,
      Math.max(350, profile.baseTicket * season * growth * rep * competition * ticketMult),
    ),
  );
};

export const generateOpportunities = (
  state: GameState,
): { ops: Opportunity[]; nextId: number } => {
  const profile = SECTOR_PROFILES[state.company.sector];
  const rand = rng(toMonthIndex(state.calendar) * 997 + state.nextId * 13 + state.monthsPlayed);
  const cap = maxDealNet(state);
  const count = 2 + Math.floor(rand() * 2);
  const ops: Opportunity[] = [];
  let id = state.nextId;

  for (let i = 0; i < count; i++) {
    const kind: Opportunity["kind"] = rand() < profile.saleChance ? "sale" : "supply";
    const sizeFactor = 0.35 + rand() * 0.65;
    const net = round2(Math.max(300, Math.min(cap, cap * sizeFactor)));

    if (kind === "sale") {
      const isPa = rand() < profile.paChance;
      const clientType: ClientType = isPa ? "pa" : "private";
      const termMonths = pick(isPa ? profile.paTerms : profile.privateTerms, rand);
      const who = isPa
        ? `${pick(PA_NAMES, rand)} di ${state.company.city}`
        : pick(CLIENT_NAMES, rand);
      ops.push({
        id: id++,
        kind,
        title: isPa ? `Appalto PA · ${who}` : `Commessa · ${who}`,
        net,
        expiresInMonths: 1,
        clientType,
        termMonths,
      });
    } else {
      ops.push({
        id: id++,
        kind,
        title: `Fornitura · ${pick(SUPPLIER_NAMES, rand)}`,
        net,
        expiresInMonths: 1,
        termMonths: 1,
      });
    }
  }
  return { ops, nextId: id };
};

export const acceptOpportunity = (state: GameState, opportunityId: number): GameState => {
  const op = state.opportunities.find((o) => o.id === opportunityId);
  if (!op) return state;
  const cap = maxDealNet(state);
  if (op.net > cap + 0.01) return state;

  if (op.kind === "sale" && salesAcceptedThisMonth(state) >= monthlyCapacity(state)) {
    const blocked = structuredClone(state);
    blocked.log.unshift({
      id: blocked.nextId++,
      monthIdx: toMonthIndex(blocked.calendar),
      tone: "bad",
      text: `Capacità piena (${monthlyCapacity(state)} commesse/mese). Assumi o alza la reputazione.`,
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
        : `Ordinata ${op.title} · ${op.net.toLocaleString("it-IT")} € + IVA.`,
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

/** Apply 0–1 random monthly world event after the books close. */
export const applyRandomEvent = (state: GameState): GameState => {
  const next = structuredClone(state);
  const rand = rng(toMonthIndex(next.calendar) * 1337 + next.monthsPlayed * 17);
  const skipAbove = DIFFICULTIES[next.difficulty ?? "normal"].eventSkipAbove;
  if (rand() > skipAbove) return next;

  const roll = rand();
  const idx = toMonthIndex(next.calendar);

  if (roll < 0.22) {
    const openAr = next.invoices.find((i) => i.kind === "AR" && !i.settled && !i.defaulted);
    if (openAr) {
      openAr.dueIdx += 1;
      next.log.unshift({
        id: next.nextId++,
        monthIdx: idx,
        tone: "bad",
        text: `Cliente in ritardo: fattura #${openAr.id} slitta di un altro mese.`,
      });
    }
  } else if (roll < 0.4) {
    const hit = round2(180 + rand() * 620);
    next.company.cash = round2(next.company.cash - hit);
    next.ytd.otherCosts = round2(next.ytd.otherCosts + hit);
    next.log.unshift({
      id: next.nextId++,
      monthIdx: idx,
      tone: "bad",
      text: `Costo imprevisto: −${hit.toLocaleString("it-IT")} €.`,
    });
  } else if (roll < 0.58) {
    const profile = SECTOR_PROFILES[next.company.sector];
    const isPa = rand() < profile.paChance + 0.1;
    const bonus = round2(maxDealNet(next) * (0.4 + rand() * 0.3));
    const termMonths = pick(isPa ? profile.paTerms : profile.privateTerms, rand);
    next.opportunities.push({
      id: next.nextId++,
      kind: "sale",
      title: isPa ? `Urgenza PA · ${pick(PA_NAMES, rand)}` : `Urgenza · ${pick(CLIENT_NAMES, rand)}`,
      net: bonus,
      expiresInMonths: 1,
      clientType: isPa ? "pa" : "private",
      termMonths,
    });
    next.log.unshift({
      id: next.nextId++,
      monthIdx: idx,
      tone: "good",
      text: `Commessa urgente (${isPa ? "PA" : "privato"}) da ${bonus.toLocaleString("it-IT")} € + IVA.`,
    });
  } else if (roll < 0.75) {
    const mods = marketModifiersFromIndex(next.company.densityIndex);
    next.log.unshift({
      id: next.nextId++,
      monthIdx: idx,
      tone: "neutral",
      text: `Mercato ${SECTOR_PROFILES[next.company.sector].id}: pressione ${mods.pressureLabel}.`,
    });
  } else {
    next.log.unshift({
      id: next.nextId++,
      monthIdx: idx,
      tone: "neutral",
      text: "Promemoria: F24, stipendi e TFR non aspettano gli incassi PA.",
    });
  }

  next.log = next.log.slice(0, 12);
  return next;
};

export const seedNewGame = (state: GameState): GameState => {
  const next = structuredClone(state);
  const { ops, nextId } = generateOpportunities(next);
  next.opportunities = ops;
  next.nextId = nextId;
  next.log = [
    {
      id: next.nextId++,
      monthIdx: toMonthIndex(next.calendar),
      tone: "neutral",
      text: "Azienda aperta. Commesse del mese sole: PA paga tardi, i privati a volte non pagano.",
    },
  ];
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
  const next = structuredClone(state);
  const { ops, nextId } = generateOpportunities(next);
  next.opportunities = ops;
  next.nextId = Math.max(next.nextId, nextId);
  return next;
};
