import { countRole, monthlyCapacity } from "./workforce";
import { round2, toMonthIndex, type GameState } from "./types";

export const DEFAULT_STAFF_MORALE = 70;

export const clampMorale = (n: number): number =>
  Math.max(0, Math.min(100, Math.round(n)));

export const applyMoraleDrift = (
  state: GameState,
  opts?: { hadFormazione?: boolean },
): GameState => {
  const next = structuredClone(state);
  next.staffMorale ??= DEFAULT_STAFF_MORALE;

  let delta = 0;
  if (next.company.cash < 0) {
    delta -= 4;
  } else if ((next.lastCloseSummary?.delta ?? 0) >= 0) {
    delta += 2;
  }
  if (countRole(next, "Responsabile") >= 1) delta += 1;
  if (opts?.hadFormazione || next.activeProject?.id === "formazione") delta += 3;
  if (next.employees.length > monthlyCapacity(next) + 3) delta -= 2;

  next.staffMorale = clampMorale(next.staffMorale + delta);
  return next;
};

export const rollStaffResignation = (
  state: GameState,
  rand: () => number = Math.random,
): GameState => {
  const morale = state.staffMorale ?? DEFAULT_STAFF_MORALE;
  if (morale >= 30 || state.employees.length === 0 || rand() >= 0.12) {
    return state;
  }

  const next = structuredClone(state);
  const idx = Math.floor(rand() * next.employees.length);
  const emp = next.employees[idx]!;
  const payout = round2(emp.tfrAccrued);
  next.company.cash = round2(next.company.cash - payout);
  next.tfrFund = round2(Math.max(0, next.tfrFund - payout));
  next.employees = next.employees.filter((e) => e.id !== emp.id);
  next.log.unshift({
    id: next.nextId++,
    monthIdx: toMonthIndex(next.calendar),
    tone: "bad",
    text: `Dimissioni: ${emp.role} lascia l'azienda${payout > 0 ? ` (TFR ${payout.toLocaleString("it-IT")} €)` : ""}.`,
  });
  next.log = next.log.slice(0, 12);
  return next;
};
