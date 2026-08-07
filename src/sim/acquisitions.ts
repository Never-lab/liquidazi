import { SECTORS, type SectorId } from "../config/market";
import {
  HOLDING_SLOT_BASE,
  VALUE_MULTIPLE_MAX,
  VALUE_MULTIPLE_MIN,
} from "../config/holding";
import { maxDealNet, rng } from "./events";
import {
  round2,
  toMonthIndex,
  type AcquisitionRisk,
  type AcquisitionTarget,
  type GameState,
  type Subsidiary,
} from "./types";

const TARGET_NAMES = [
  "Alfa Locale Srl",
  "Beta Servizi",
  "Gamma Trade",
  "Delta Lab",
  "Epsilon Shop",
  "Zeta Soft",
  "Eta Logistica",
  "Theta Studio",
  "Iota Food",
  "Kappa Tech",
];

const RISK_CHANCE: Record<AcquisitionRisk, number> = {
  low: 0.12,
  med: 0.25,
  high: 0.4,
};

const pick = <T,>(arr: T[], rand: () => number): T => arr[Math.floor(rand() * arr.length)]!;

const RISK_MULT = { low: 1.05, med: 1, high: 0.9 } as const;

export const estimateSubsidiaryValue = (sub: {
  monthlyEbitda: number;
  risk: AcquisitionRisk;
  monthsOwned: number;
}): number => {
  const ageBoost = Math.min(0.15, sub.monthsOwned * 0.01);
  const multiple = (VALUE_MULTIPLE_MIN + VALUE_MULTIPLE_MAX) / 2; // 11
  return round2(sub.monthlyEbitda * multiple * RISK_MULT[sub.risk] * (1 + ageBoost));
};

export const generateAcquisitionBoard = (
  state: GameState,
): { board: AcquisitionTarget[]; nextId: number } => {
  const rand = rng(toMonthIndex(state.calendar) * 4111 + state.monthsPlayed * 19 + state.nextId);
  const cap = maxDealNet(state);
  const count = 2 + Math.floor(rand() * 2);
  const board: AcquisitionTarget[] = [];
  let id = state.nextId;

  for (let i = 0; i < count; i++) {
    const sector = pick(SECTORS, rand).id as SectorId;
    const riskRoll = rand();
    const risk: AcquisitionRisk = riskRoll < 0.4 ? "low" : riskRoll < 0.75 ? "med" : "high";
    const price = round2(Math.max(10000, cap * (2.8 + rand() * 3.2) * (risk === "high" ? 0.9 : 1.05)));
    const monthlyEbitda = round2(price * (0.005 + rand() * 0.009) * (risk === "high" ? 1.1 : 1));
    const capacityBonus = rand() < 0.28 ? 1 : 0;
    board.push({
      id: id++,
      name: pick(TARGET_NAMES, rand),
      sector,
      price,
      monthlyEbitda,
      capacityBonus,
      risk,
    });
  }
  return { board, nextId: id };
};

export const refreshAcquisitionBoard = (state: GameState): GameState => {
  // Refresh every 3 months (including month 0 seed via seedNewGame / first advance)
  if (state.monthsPlayed > 0 && state.monthsPlayed % 3 !== 0) return state;
  const next = structuredClone(state);
  const { board, nextId } = generateAcquisitionBoard(next);
  next.acquisitionBoard = board;
  next.nextId = Math.max(next.nextId, nextId);
  return next;
};

export const buyAcquisition = (state: GameState, targetId: number): GameState => {
  const subs = state.subsidiaries ?? [];
  const cap = state.holdingSlotCap ?? HOLDING_SLOT_BASE;
  if (subs.length >= cap) return state;
  const target = (state.acquisitionBoard ?? []).find((t) => t.id === targetId);
  if (!target || state.company.cash < target.price) return state;

  const next = structuredClone(state);
  next.company.cash = round2(next.company.cash - target.price);
  next.acquisitionBoard = (next.acquisitionBoard ?? []).filter((t) => t.id !== targetId);
  const sub: Subsidiary = {
    id: target.id,
    name: target.name,
    sector: target.sector,
    monthlyEbitda: target.monthlyEbitda,
    capacityBonus: target.capacityBonus,
    monthsOwned: 0,
    risk: target.risk,
    purchasePrice: target.price,
    listedUntilMonthIdx: null,
    capexCooldownMonths: 0,
  };
  next.subsidiaries = [...(next.subsidiaries ?? []), sub];
  next.log.unshift({
    id: next.nextId++,
    monthIdx: toMonthIndex(next.calendar),
    tone: "good",
    text: `Acquisita ${target.name} (−${target.price.toLocaleString("it-IT")} €). EBITDA ~${target.monthlyEbitda.toLocaleString("it-IT")} €/mese.`,
  });
  next.log = next.log.slice(0, 12);
  return next;
};

/** Monthly drip + integration risk. Mutates clone passed in advanceMonth. */
export const applySubsidiaryMonth = (state: GameState, rand: () => number): void => {
  const subs = state.subsidiaries ?? [];
  if (subs.length === 0) return;

  let drip = 0;
  for (const sub of subs) {
    sub.monthsOwned += 1;
    drip = round2(drip + sub.monthlyEbitda);
  }
  if (drip > 0) {
    state.company.cash = round2(state.company.cash + drip);
    state.ytd.revenue = round2(state.ytd.revenue + drip);
    state.log.unshift({
      id: state.nextId++,
      monthIdx: toMonthIndex(state.calendar),
      tone: "good",
      text: `Partecipate: +${drip.toLocaleString("it-IT")} € di contributo mensile.`,
    });
    state.log = state.log.slice(0, 12);
  }

  if (state.quietMode) return;

  const harden =
    (state.difficulty ?? "normal") !== "easy" &&
    state.monthsPlayed >= 8 &&
    state.compliance < 70
      ? 1.25
      : 1;

  for (const sub of subs) {
    if (rand() < RISK_CHANCE[sub.risk] * harden) {
      const hit = round2(sub.monthlyEbitda * (1 + rand()));
      state.company.cash = round2(state.company.cash - hit);
      state.ytd.otherCosts = round2(state.ytd.otherCosts + hit);
      state.log.unshift({
        id: state.nextId++,
        monthIdx: toMonthIndex(state.calendar),
        tone: "bad",
        text: `Integrazione ${sub.name}: costo una tantum −${hit.toLocaleString("it-IT")} €.`,
      });
      state.log = state.log.slice(0, 12);
      break; // at most one integration hit per month
    }
  }
};
