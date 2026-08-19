import {
  STAFF_EVENT_TEMPLATES,
  type StaffEventTemplate,
} from "../config/staffAbsences";
import { rng } from "./rng";
import {
  toMonthIndex,
  type Employee,
  type EventPopup,
  type GameState,
  type PendingEvent,
  type StaffAbsenceKind,
  type StaffEventTarget,
} from "./types";

const MALATTIA_MONTHS = new Set([10, 11, 12, 1, 2, 3]);
const MALATTIA_CHANCE = 0.1;

const pushLog = (state: GameState, tone: "good" | "bad" | "neutral", text: string): void => {
  state.log.unshift({
    id: state.nextId++,
    monthIdx: toMonthIndex(state.calendar),
    tone,
    text,
  });
  state.log = state.log.slice(0, 12);
};

const resetSickYearIfNeeded = (state: GameState): void => {
  if (state.calendar.month !== 1) return;
  for (const emp of state.employees) {
    emp.sickMonthsYtd = 0;
  }
};

const tickAbsences = (employees: Employee[]): void => {
  for (const emp of employees) {
    if (!emp.absence) continue;
    emp.absence.monthsLeft -= 1;
    if (emp.absence.monthsLeft <= 0) {
      emp.absence = undefined;
    }
  }
};

const absenceLogLabel = (kind: StaffAbsenceKind, role: string, months: number): string => {
  switch (kind) {
    case "malattia":
      return `${role} in malattia (${months} ${months === 1 ? "mese" : "mesi"}): 0 FL.`;
    case "permesso":
      return `${role} in permesso: FL −50% questo mese.`;
    case "ferie":
      return `${role} in ferie: 0 FL.`;
    case "maternita":
      return `${role} in maternità (${months} mesi): 0 FL.`;
    case "paternita":
      return `${role} in paternità: FL −50%.`;
    case "allattamento":
      return `${role} in allattamento (${months} mesi): FL −50%.`;
    case "congedo_parentale":
      return `${role} in congedo parentale (${months} mesi): FL −50%.`;
    case "permesso_104":
      return `${role} in permesso 104: 0 FL.`;
  }
};

/** Applica assenza al dipendente (da evento scelta o test). */
export const applyStaffAbsence = (state: GameState, target: StaffEventTarget): void => {
  const emp = state.employees.find((e) => e.id === target.employeeId);
  if (!emp || emp.absence) return;
  emp.absence = { kind: target.kind, monthsLeft: target.months };
  if (target.kind === "malattia") {
    emp.sickMonthsYtd = (emp.sickMonthsYtd ?? 0) + target.months;
  }
  pushLog(state, "neutral", absenceLogLabel(target.kind, emp.role, target.months));
};

const resolveMonths = (tpl: StaffEventTemplate, rand: () => number): number =>
  typeof tpl.months === "function" ? tpl.months(rand) : tpl.months;

const eligibleEmployees = (
  state: GameState,
  tpl: StaffEventTemplate,
  months: number,
): Employee[] =>
  state.employees.filter((emp) => {
    if (emp.absence) return false;
    emp.gender ??= emp.id % 2 === 0 ? "F" : "M";
    if (tpl.gender && emp.gender !== tpl.gender) return false;
    const sickMonthsYtd = emp.sickMonthsYtd ?? 0;
    if (tpl.eligible && !tpl.eligible({ sickMonthsYtd, months })) return false;
    return true;
  });

const setStaffPopup = (state: GameState, popup: EventPopup): void => {
  state.lastEventPopup = popup;
};

/** Roll weighted staff event; mutates state.pendingEvent when queued. */
export const tryQueueStaffEvent = (state: GameState, rand?: () => number): boolean => {
  if (state.pendingEvent || state.quietMode) return false;
  if (state.employees.length === 0) return false;

  const roll = rand ?? rng(toMonthIndex(state.calendar) * 9001 + state.monthsPlayed * 13 + state.employees.length);
  const head = state.employees.length;
  const chance = Math.min(0.45, 0.22 + head * 0.03);
  if (roll() > chance) return false;

  const candidates: { tpl: StaffEventTemplate; emp: Employee; months: number }[] = [];
  for (const tpl of STAFF_EVENT_TEMPLATES) {
    const months = resolveMonths(tpl, roll);
    for (const emp of eligibleEmployees(state, tpl, months)) {
      candidates.push({ tpl, emp, months });
    }
  }
  if (candidates.length === 0) return false;

  const pick = candidates[Math.floor(roll() * candidates.length)]!;
  const { tpl, emp, months } = pick;
  const pending: PendingEvent = {
    id: tpl.id,
    title: tpl.title(emp.role),
    body: tpl.body(emp.role, months),
    family: "personale",
    staffTarget: { employeeId: emp.id, kind: tpl.kind, months },
    options: [{ id: "ok", label: tpl.optionLabel }],
  };
  state.pendingEvent = pending;
  pushLog(state, "neutral", `Decisione personale: ${pending.title}`);
  return true;
};

/** Eventi personale + assenze stagionali: chiamare a fine mese prima del refresh tabellone. */
export const tickStaffEvents = (state: GameState): GameState => {
  if (state.quietMode) return state;
  const next = structuredClone(state);
  resetSickYearIfNeeded(next);
  tickAbsences(next.employees);

  const idx = toMonthIndex(next.calendar);
  next.workforceMalattiaMonthIdx = null;

  const rand = rng(idx * 431 + next.monthsPlayed * 17 + next.employees.length);
  const month = next.calendar.month;

  if (MALATTIA_MONTHS.has(month) && rand() < MALATTIA_CHANCE) {
    next.workforceMalattiaMonthIdx = idx;
    pushLog(next, "bad", "Malattie in azienda: forza lavoro −15% questo mese.");
    setStaffPopup(next, {
      title: "Malattie in azienda",
      body: "Picco stagionale (ottobre–marzo): forza lavoro −15% questo mese.",
      family: "personale",
      tone: "bad",
    });
  }

  if (month === 7 || month === 8) {
    pushLog(next, "neutral", "Ferie estive: forza lavoro −50% (luglio–agosto).");
    setStaffPopup(next, {
      title: "Ferie estive",
      body: "Luglio–agosto: forza lavoro −50%. Meno capacità operativa in tabellone.",
      family: "personale",
      tone: "neutral",
    });
  }
  if (month === 12) {
    pushLog(next, "neutral", "Festività natalizie: forza lavoro −10% (dicembre).");
    setStaffPopup(next, {
      title: "Festività natalizie",
      body: "Dicembre: forza lavoro −10% per chiusure e permessi.",
      family: "personale",
      tone: "neutral",
    });
  }

  return next;
};

/** Genere didattico deterministico alla assunzione. */
export const rollEmployeeGender = (state: GameState): "M" | "F" => {
  const u = rng(state.nextId * 19 + toMonthIndex(state.calendar) * 7)();
  return u < 0.5 ? "M" : "F";
};

const ABSENCE_LABELS: Record<StaffAbsenceKind, (n: number) => string> = {
  malattia: (n) => `malattia (${n} ${n === 1 ? "mese" : "mesi"})`,
  permesso: (n) => `permesso (${n} mese/i)`,
  ferie: (n) => `ferie (${n} mese/i)`,
  maternita: (n) => `maternità (${n} mesi)`,
  paternita: (n) => `paternità (${n} mese/i)`,
  allattamento: (n) => `allattamento (${n} mesi)`,
  congedo_parentale: (n) => `congedo parentale (${n} mesi)`,
  permesso_104: (n) => `permesso 104 (${n} mese/i)`,
};

export const absenceLabel = (emp: Employee): string | null => {
  if (!emp.absence) return null;
  return ABSENCE_LABELS[emp.absence.kind](emp.absence.monthsLeft);
};

/** Stub apply for resolveEventOption lookup (real apply via staffTarget). */
export const STAFF_CHOICE_STUBS = STAFF_EVENT_TEMPLATES.map((tpl) => ({
  kind: "choice" as const,
  id: tpl.id,
  family: "personale" as const,
  title: tpl.title("Dipendente"),
  body: tpl.body("Dipendente", 1),
  options: [{ id: "ok", label: tpl.optionLabel, apply: (_s: GameState) => {} }],
}));

export const staffEventIds = (): string[] => STAFF_EVENT_TEMPLATES.map((t) => t.id);
