import { rng } from "./rng";
import { cityById } from "../config/market";
import { toMonthIndex, type GameState, type Rival } from "./types";

export const seedRival = (state: GameState): Rival => {
  const city = cityById(state.company.city);
  const names = ["NordTrade", "Locale Fast", "PrimoPiano", "MetroServizi", "Concorrenza+"];
  const seed = state.company.city.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const name = `${names[seed % names.length]} ${city.label}`;
  return { name, heat: 35 + (seed % 25) };
};

export const tickRivalHeat = (state: GameState, salesTaken: number, capacity: number): GameState => {
  if (!state.rival) return state;
  const next = structuredClone(state);
  const rival = { ...next.rival! };
  if (salesTaken >= Math.max(1, Math.ceil(capacity / 2))) {
    rival.heat = Math.max(0, rival.heat - 4);
  } else if (salesTaken === 0) {
    rival.heat = Math.min(100, rival.heat + 5);
  } else {
    rival.heat = Math.min(100, rival.heat + 1);
  }
  next.rival = rival;
  return next;
};

/** Steal one sale from board if heat high. */
export const applyRivalSteal = (state: GameState): GameState => {
  if (state.quietMode || !state.rival) return state;
  if (state.rival.heat < 45) return state;
  const rand = rng(toMonthIndex(state.calendar) * 9091 + state.monthsPlayed * 7);
  const chance = 0.15 + (state.rival.heat - 45) / 200;
  if (rand() > chance) return state;

  const next = structuredClone(state);
  const saleIdx = next.opportunities.findIndex((o) => o.kind === "sale" && !o.contractMonths);
  if (saleIdx < 0) return state;
  const stolen = next.opportunities[saleIdx]!;
  next.opportunities.splice(saleIdx, 1);
  next.rival = {
    ...next.rival!,
    heat: Math.min(100, next.rival!.heat + 2),
  };
  next.log.unshift({
    id: next.nextId++,
    monthIdx: toMonthIndex(next.calendar),
    tone: "bad",
    text: `${next.rival.name} ha preso «${stolen.title}» (heat ${Math.round(next.rival.heat)}).`,
  });
  next.log = next.log.slice(0, 12);
  return next;
};
