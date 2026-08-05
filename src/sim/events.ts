import { marketModifiersFromIndex } from "./market";
import {
  round2,
  toMonthIndex,
  type GameState,
  type Opportunity,
  type SectorId,
} from "./types";
import { issueCustomerInvoice, recordSupplierCost } from "./actions";

const SECTOR_BASE: Record<SectorId, number> = {
  commercio: 1100,
  servizi: 1400,
  artigianato: 1600,
  ristorazione: 850,
};

const CLIENT_NAMES = [
  "Rossi Snc", "Bianchi SRL", "Verdi & C.", "Neri Group", "Blu Servizi",
  "Gamma Soft", "Delta Trade", "Eta Logistica", "Studio Conti", "Bar Centrale",
];
const SUPPLIER_NAMES = [
  "Forniture Nord", "Materie Prime Spa", "Utenze+ ", "Magazzino Est", "Tech Supply",
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

/**
 * Max deal size for a startup SRL — scales with staff and months,
 * squeezed by local competition. Hard cap keeps spam-500k impossible.
 */
export const maxDealNet = (state: GameState): number => {
  const base = SECTOR_BASE[state.company.sector];
  const months = Math.max(0, state.monthsPlayed);
  const staff = state.employees.length;
  const dens = state.company.densityIndex;
  const growth = 1 + months * 0.045 + staff * 0.18;
  const competition = dens > 1 ? Math.max(0.7, 1 - (dens - 1) * 0.12) : 1 + (1 - dens) * 0.08;
  return round2(Math.min(18000, Math.max(400, base * growth * competition)));
};

const pick = <T,>(arr: T[], rand: () => number): T => arr[Math.floor(rand() * arr.length)]!;

export const generateOpportunities = (
  state: GameState,
): { ops: Opportunity[]; nextId: number } => {
  const rand = rng(toMonthIndex(state.calendar) * 997 + state.nextId * 13 + state.monthsPlayed);
  const cap = maxDealNet(state);
  const count = 2 + Math.floor(rand() * 2); // 2–3
  const ops: Opportunity[] = [];
  let id = state.nextId;

  for (let i = 0; i < count; i++) {
    const kind: Opportunity["kind"] = rand() < 0.65 ? "sale" : "supply";
    const sizeFactor = 0.35 + rand() * 0.65;
    const net = round2(Math.max(350, Math.min(cap, cap * sizeFactor)));
    ops.push({
      id: id++,
      kind,
      title: kind === "sale" ? `Commessa · ${pick(CLIENT_NAMES, rand)}` : `Fornitura · ${pick(SUPPLIER_NAMES, rand)}`,
      net,
      expiresInMonths: 1,
    });
  }
  return { ops, nextId: id };
};

export const acceptOpportunity = (state: GameState, opportunityId: number): GameState => {
  const op = state.opportunities.find((o) => o.id === opportunityId);
  if (!op) return state;
  const cap = maxDealNet(state);
  if (op.net > cap + 0.01) return state;

  let next =
    op.kind === "sale"
      ? issueCustomerInvoice(state, op.net)
      : recordSupplierCost(state, op.net);
  next = structuredClone(next);
  next.opportunities = next.opportunities.filter((o) => o.id !== opportunityId);
  next.log.unshift({
    id: next.nextId++,
    monthIdx: toMonthIndex(next.calendar),
    tone: "good",
    text:
      op.kind === "sale"
        ? `Accettata ${op.title} per ${op.net.toLocaleString("it-IT")} € + IVA.`
        : `Ordinata ${op.title} per ${op.net.toLocaleString("it-IT")} € + IVA.`,
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
  if (rand() > 0.55) return next; // quiet month often

  const roll = rand();
  const idx = toMonthIndex(next.calendar);

  if (roll < 0.25) {
    const openAr = next.invoices.find((i) => i.kind === "AR" && !i.settled);
    if (openAr) {
      openAr.dueIdx += 1;
      next.log.unshift({
        id: next.nextId++,
        monthIdx: idx,
        tone: "bad",
        text: `Cliente in ritardo: fattura #${openAr.id} slitta di un mese.`,
      });
    }
  } else if (roll < 0.45) {
    const hit = round2(180 + rand() * 620);
    next.company.cash = round2(next.company.cash - hit);
    next.ytd.otherCosts = round2(next.ytd.otherCosts + hit);
    next.log.unshift({
      id: next.nextId++,
      monthIdx: idx,
      tone: "bad",
      text: `Costo imprevisto (riparazione/utenze): −${hit.toLocaleString("it-IT")} €.`,
    });
  } else if (roll < 0.65) {
    const bonus = round2(maxDealNet(next) * (0.4 + rand() * 0.3));
    next.opportunities.push({
      id: next.nextId++,
      kind: "sale",
      title: `Urgenza · ${pick(CLIENT_NAMES, rand)}`,
      net: bonus,
      expiresInMonths: 1,
    });
    next.log.unshift({
      id: next.nextId++,
      monthIdx: idx,
      tone: "good",
      text: `Arriva una commessa urgente da ${bonus.toLocaleString("it-IT")} € + IVA.`,
    });
  } else if (roll < 0.8) {
    const mods = marketModifiersFromIndex(next.company.densityIndex);
    next.log.unshift({
      id: next.nextId++,
      monthIdx: idx,
      tone: "neutral",
      text: `Mercato locale: pressione ${mods.pressureLabel}. Meglio non gonfiare i listini.`,
    });
  } else {
    next.log.unshift({
      id: next.nextId++,
      monthIdx: idx,
      tone: "neutral",
      text: "Promemoria: F24 e stipendi non aspettano il fatturato da sogno.",
    });
  }

  next.log = next.log.slice(0, 12);
  return next;
};

/** Seed opening deal board after createInitialGameState(opts). */
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
      text: "Azienda aperta. Accetta solo le commesse del mese — niente fatture inventate.",
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

/** Replace deal board for the new month. */
export const refreshMarketBoard = (state: GameState): GameState => {
  const next = structuredClone(state);
  const { ops, nextId } = generateOpportunities(next);
  next.opportunities = ops;
  next.nextId = Math.max(next.nextId, nextId);
  return next;
};
