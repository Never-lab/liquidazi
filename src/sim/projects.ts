import { getProjectDef, type ProjectId } from "../config/projects";
import { round2, type GameState } from "./types";

export const skipProjectOffer = (state: GameState): GameState => {
  if (!state.projectOffer) return state;
  const next = structuredClone(state);
  next.projectOffer = null;
  return next;
};

/** Rent charged this month — project rentFactor without mutating stored monthlyRent. */
export const effectiveMonthlyRent = (state: GameState): number => {
  const base = state.company.monthlyRent;
  if (base <= 0) return 0;
  const factor = state.activeProject
    ? getProjectDef(state.activeProject.id).rentFactor
    : 1;
  return round2(base * factor);
};

/** Compliance tick + duration countdown; clears at zero and logs completion. */
export const processActiveProjectForMonth = (
  state: GameState,
  monthIdx: number,
): GameState => {
  if (!state.activeProject) return state;

  const next = structuredClone(state);
  const def = getProjectDef(next.activeProject!.id);
  if (def.compliancePerMonth > 0) {
    next.compliance = Math.min(100, next.compliance + def.compliancePerMonth);
  }

  const left = next.activeProject!.monthsLeft - 1;
  if (left > 0) {
    next.activeProject = { ...next.activeProject!, monthsLeft: left };
    return next;
  }

  const returned = next.activeProject!.frozenCash;
  next.company.cash = round2(next.company.cash + returned);
  next.activeProject = null;
  next.log.unshift({
    id: next.nextId++,
    monthIdx,
    tone: "good",
    text:
      returned > 0
        ? `Progetto completato: ${def.label} · restituiti ${returned.toLocaleString("it-IT")} €.`
        : `Progetto completato: ${def.label}.`,
  });
  next.log = next.log.slice(0, 12);
  return next;
};

export const acceptProject = (state: GameState, id: ProjectId): GameState => {
  if (state.activeProject) return state;
  if (!state.projectOffer?.options.includes(id)) return state;
  const def = getProjectDef(id);
  const totalCost = def.cost + def.frozenCash;
  if (state.company.cash < totalCost) return state;

  const next = structuredClone(state);
  next.company.cash = round2(next.company.cash - totalCost);
  next.activeProject = {
    id,
    monthsLeft: def.durationMonths,
    frozenCash: def.frozenCash,
  };
  next.projectOffer = null;
  return next;
};

export const tickActiveProject = (state: GameState): GameState => {
  if (!state.activeProject) return state;

  const next = structuredClone(state);
  const left = next.activeProject!.monthsLeft - 1;
  if (left > 0) {
    next.activeProject = { ...next.activeProject!, monthsLeft: left };
    return next;
  }

  const returned = next.activeProject!.frozenCash;
  next.company.cash = round2(next.company.cash + returned);
  next.activeProject = null;
  return next;
};
