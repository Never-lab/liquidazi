import {
  WORKFORCE_BASE,
  WORKFORCE_PER_LEGACY_SLOT,
  workforceForRole,
  workforceRequiredForNet,
  workforceRequiredForSale,
} from "../config/workforce";
import { absenceFlMult } from "../config/staffAbsences";
import { getProjectDef } from "../config/projects";
import { upgradeLevel } from "../config/upgrades";
import { migrateUpgradeState } from "./migrateUpgrades";
import { capacityPressurePenalty } from "./pressures";
import { round2, toMonthIndex, type Employee, type GameState } from "./types";

export { workforceRequiredForNet, workforceRequiredForSale };

const DEFAULT_STAFF_MORALE = 70;

const CONTRACT_WORKFORCE_LOCK = 15;

export const contractWorkforceLocked = (state: GameState): number =>
  (state.activeContracts ?? []).reduce(
    (s, c) => s + (c.workforceLock ?? c.slotCost ?? CONTRACT_WORKFORCE_LOCK),
    0,
  );

const seasonalMult = (month: number): number => {
  if (month === 12) return 0.9;
  if (month === 7 || month === 8) return 0.5;
  return 1;
};

const malattiaMult = (state: GameState): number => {
  const idx = toMonthIndex(state.calendar);
  return state.workforceMalattiaMonthIdx === idx ? 0.85 : 1;
};

/** FL effettiva del singolo dipendente (assenze individuali). */
export const employeeWorkforceContribution = (emp: Employee): number => {
  const base = workforceForRole(emp.role);
  if (!emp.absence) return base;
  return round2(base * absenceFlMult(emp.absence.kind));
};

const staffWorkforceRaw = (state: GameState): number =>
  state.employees.reduce((s, e) => s + employeeWorkforceContribution(e), 0);

const legacySlotBonuses = (state: GameState): number => {
  const upgradeLevels = migrateUpgradeState(state);
  const processi = upgradeLevel(upgradeLevels, "processi");
  const temp = (state.tempCapacityMonths ?? 0) > 0 ? 1 : 0;
  const growth = state.growthCapacityBonus ?? 0;
  const subCap = (state.subsidiaries ?? []).reduce((s, sub) => s + sub.capacityBonus, 0);
  const projCap = state.activeProject
    ? getProjectDef(state.activeProject.id).capacityBonus
    : 0;
  const slots = processi + temp + growth + subCap + projCap;
  return slots * WORKFORCE_PER_LEGACY_SLOT;
};

const projWorkforcePenalty = (state: GameState): number =>
  state.activeProject
    ? getProjectDef(state.activeProject.id).slotPenalty * WORKFORCE_PER_LEGACY_SLOT
    : 0;

/** FL disponibile nel mese corrente (prima delle commesse già accettate). */
export const availableWorkforce = (state: GameState): number => {
  const morale = state.staffMorale ?? DEFAULT_STAFF_MORALE;
  const staffRaw = staffWorkforceRaw(state);
  const staffMorale = Math.round(staffRaw * (0.75 + 0.25 * (morale / 100)));
  let total =
    WORKFORCE_BASE +
    staffMorale +
    legacySlotBonuses(state) -
    contractWorkforceLocked(state) -
    projWorkforcePenalty(state) -
    capacityPressurePenalty(state) * WORKFORCE_PER_LEGACY_SLOT;

  total = round2(total * seasonalMult(state.calendar.month) * malattiaMult(state));
  return Math.max(0, Math.round(total));
};

/** FL già impegnata dalle commesse accettate nel mese corrente. */
export const workforceUsedThisMonth = (state: GameState): number => {
  const idx = toMonthIndex(state.calendar);
  const fromInvoices = state.invoices
    .filter((i) => i.kind === "AR" && i.issuedIdx === idx)
    .reduce((s, i) => s + (i.workforceRequired ?? 0), 0);
  const fromContracts = (state.activeContracts ?? [])
    .filter((c) => c.acceptedMonthIdx === idx)
    .reduce((s, c) => s + (c.workforceAcceptCost ?? 0), 0);
  return fromInvoices + fromContracts;
};

export const workforceRemaining = (state: GameState): number =>
  Math.max(0, availableWorkforce(state) - workforceUsedThisMonth(state));

/** Proxy per generazione tabellone: ~1 commessa ogni 15 FL. */
export const monthlyCapacity = (state: GameState): number =>
  Math.max(1, Math.floor(availableWorkforce(state) / 15));

export const canAcceptWorkforce = (state: GameState, required: number): boolean =>
  required > 0 && workforceRemaining(state) >= required;

export const workforceBlockHint = (state: GameState, required: number): string => {
  const avail = availableWorkforce(state);
  const used = workforceUsedThisMonth(state);
  if (avail <= 0) {
    return "Forza lavoro insufficiente: assumi personale o attendi la fine delle assenze.";
  }
  return `Servono ${required} FL (disponibili ${avail - used}/${avail}). Assumi o libera FL.`;
};

/** Count employees with a given role (e.g. "Impiegato"). */
export const countRole = (state: GameState, role: string): number =>
  state.employees.filter((e) => e.role === role).length;
