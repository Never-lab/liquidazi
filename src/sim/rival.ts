import { rng } from "./rng";
import { cityById } from "../config/market";
import { toMonthIndex, type GameState, type Rival } from "./types";

export type PressureBand = "calma" | "tesa" | "guerra";
export type RivalPhase = "arrivo" | "caldo" | "resa";

export const RIVAL_PRESSURE_TOOLTIP =
  "Pressione rivale: sale se prendi poche commesse o le lasci scadere; scende se usi bene la FL e con Responsabile / campagne. In Guerra ruba più lead e forza eventi.";

export const pressureBand = (heat: number): PressureBand => {
  if (heat < 40) return "calma";
  if (heat < 70) return "tesa";
  return "guerra";
};

export const rivalPhase = (monthsPlayed: number): RivalPhase => {
  if (monthsPlayed < 6) return "arrivo";
  if (monthsPlayed < 18) return "caldo";
  return "resa";
};

export const pressureBandLabel = (band: PressureBand): string =>
  band === "calma" ? "Calma" : band === "tesa" ? "Tesa" : "Guerra";

/** Cost of rival_push campaign option. */
export const rivalCampaignCost = (cash: number): number =>
  Math.max(800, Math.round(Math.max(0, cash) * 0.04));

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
  if (rival.floor != null && !rival.contained) {
    rival.heat = Math.min(100, Math.max(rival.floor, rival.heat));
  }
  next.rival = rival;
  return next;
};

/** Steal sales from board by pressure band (skip Arrivo / contained / quiet). */
export const applyRivalSteal = (state: GameState): GameState => {
  if (state.quietMode || !state.rival || state.rival.contained) return state;
  if (rivalPhase(state.monthsPlayed) === "arrivo") return state;

  const band = pressureBand(state.rival.heat);
  if (band === "calma") return state;

  const maxSteals = band === "guerra" ? 2 : 1;
  const chance =
    band === "guerra"
      ? Math.min(0.7, 0.45 + (state.rival.heat - 70) / 100)
      : 0.25 + (state.rival.heat - 40) / 150;

  let next = structuredClone(state);
  let stolen = 0;
  for (let attempt = 0; attempt < maxSteals; attempt++) {
    const rand = rng(
      toMonthIndex(next.calendar) * 9091 + next.monthsPlayed * 7 + attempt * 17 + stolen * 31,
    );
    if (rand() > chance) continue;
    const saleIdx = next.opportunities.findIndex((o) => o.kind === "sale" && !o.contractMonths);
    if (saleIdx < 0) break;
    const taken = next.opportunities[saleIdx]!;
    next.opportunities.splice(saleIdx, 1);
    stolen += 1;
    const heat = Math.min(100, (next.rival?.heat ?? 0) + 2);
    const floor = next.rival?.floor;
    const clamped =
      floor != null && !next.rival?.contained ? Math.max(floor, heat) : heat;
    next.rival = {
      ...next.rival!,
      heat: clamped,
    };
    next.log.unshift({
      id: next.nextId++,
      monthIdx: toMonthIndex(next.calendar),
      tone: "bad",
      text: `${next.rival.name} ha preso «${taken.title}» (pressione ${Math.round(next.rival.heat)}).`,
    });
    next.log = next.log.slice(0, 12);
  }
  return stolen > 0 ? next : state;
};

/** Late-game contain vs anchor (monthsPlayed ≥ 18). */
export const tickRivalPayoff = (state: GameState): GameState => {
  if (!state.rival || state.monthsPlayed < 18) return state;
  if (state.rival.contained) return state;

  const next = structuredClone(state);
  const rival = { ...next.rival! };

  if (rival.floor == null && rival.heat < 40) {
    rival.contained = true;
    rival.floor = undefined;
    rival.anchorClears = undefined;
    next.rival = rival;
    next.log.unshift({
      id: next.nextId++,
      monthIdx: toMonthIndex(next.calendar),
      tone: "good",
      text: `${rival.name} contenuto: pressione bassa a lungo. Steal quasi assente.`,
    });
    next.log = next.log.slice(0, 12);
    return next;
  }

  if (rival.floor == null && rival.heat >= 70) {
    rival.floor = 55;
    rival.anchorClears = 0;
    rival.heat = Math.max(rival.floor, rival.heat);
    next.rival = rival;
    next.log.unshift({
      id: next.nextId++,
      monthIdx: toMonthIndex(next.calendar),
      tone: "bad",
      text: `${rival.name} ancorato: pressione non scende sotto 55 finché non rispondi due volte (campagna/prezzi).`,
    });
    next.log = next.log.slice(0, 12);
    return next;
  }

  if (rival.floor != null) {
    rival.heat = Math.min(100, Math.max(rival.floor, rival.heat));
    next.rival = rival;
  }
  return next;
};
