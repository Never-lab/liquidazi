import { rng } from "./rng";
import {
  toMonthIndex,
  type GameState,
  type PressureId,
  type QuarterPressure,
} from "./types";

const PRESSURES: { id: PressureId; label: string }[] = [
  { id: "cash_crunch", label: "Stretta di cassa" },
  { id: "pa_wave", label: "Onda PA" },
  { id: "inspection", label: "Stagione controlli" },
  { id: "hiring_freeze", label: "Blocco assunzioni" },
  { id: "boom", label: "Boom di domanda" },
];

export const pressureLabel = (id: PressureId): string =>
  PRESSURES.find((p) => p.id === id)?.label ?? id;

/** One-line effect for HUD chip. */
export const pressureEffectBlurb = (id: PressureId): string => {
  switch (id) {
    case "cash_crunch":
      return "Affitto +15%";
    case "pa_wave":
      return "Più PA; −1 slot se scorte 0";
    case "inspection":
      return "F24 saltati: compliance ×2";
    case "hiring_freeze":
      return "Niente assunzioni";
    case "boom":
      return "Ticket +12%; scorte −2×";
    default:
      return "";
  }
};

export const hasPressure = (state: GameState, id: PressureId): boolean =>
  state.quarterPressure?.id === id && (state.quarterPressure.monthsLeft ?? 0) > 0;

/** Months 1,4,7,10 start a quarter — roll if no active pressure. */
export const shouldRollPressure = (state: GameState): boolean => {
  const m = state.calendar.month;
  if (![1, 4, 7, 10].includes(m)) return false;
  return !state.quarterPressure || state.quarterPressure.monthsLeft <= 0;
};

export const rollPressure = (state: GameState): GameState => {
  if (state.quietMode) return state;
  const next = structuredClone(state);
  const rand = rng(toMonthIndex(next.calendar) * 2207 + next.monthsPlayed * 41);
  const pick = PRESSURES[Math.floor(rand() * PRESSURES.length)]!;
  const pressure: QuarterPressure = {
    id: pick.id,
    label: pick.label,
    monthsLeft: 3,
  };
  next.quarterPressure = pressure;
  next.log.unshift({
    id: next.nextId++,
    monthIdx: toMonthIndex(next.calendar),
    tone: "neutral",
    text: `Pressione trimestre: ${pick.label} — ${pressureEffectBlurb(pick.id)} (3 mesi).`,
  });
  next.log = next.log.slice(0, 12);
  return next;
};

export const tickPressure = (state: GameState): GameState => {
  if (!state.quarterPressure) return state;
  const next = structuredClone(state);
  next.quarterPressure = {
    ...next.quarterPressure!,
    monthsLeft: next.quarterPressure!.monthsLeft - 1,
  };
  if (next.quarterPressure.monthsLeft <= 0) {
    next.log.unshift({
      id: next.nextId++,
      monthIdx: toMonthIndex(next.calendar),
      tone: "good",
      text: `Fine pressione: ${next.quarterPressure.label}.`,
    });
    next.log = next.log.slice(0, 12);
    next.quarterPressure = null;
  }
  return next;
};

export const rentFactorFromPressure = (state: GameState): number =>
  hasPressure(state, "cash_crunch") ? 1.15 : 1;

export const ticketFactorFromPressure = (state: GameState): number =>
  hasPressure(state, "boom") ? 1.12 : 1;

export const defaultFactorFromPressure = (state: GameState): number => {
  if (hasPressure(state, "boom")) return 0.7;
  return 1;
};

export const supplyConsumeExtra = (state: GameState): number =>
  hasPressure(state, "boom") ? 1 : 0;

export const inspectionMalusMult = (state: GameState): number =>
  hasPressure(state, "inspection") ? 2 : 1;

export const paChanceBoost = (state: GameState): number =>
  hasPressure(state, "pa_wave") ? 0.25 : 0;

export const capacityPressurePenalty = (state: GameState): number => {
  if (hasPressure(state, "pa_wave") && (state.supplyMonths ?? 0) <= 0) return 1;
  return 0;
};
