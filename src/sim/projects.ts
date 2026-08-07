import { getProjectDef, type ProjectId } from "../config/projects";
import { round2, type GameState } from "./types";

export const acceptProject = (state: GameState, id: ProjectId): GameState => {
  if (state.activeProject) return state;
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
