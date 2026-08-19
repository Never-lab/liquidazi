import { rng } from "./rng";
import { toMonthIndex, type Employee, type GameState } from "./types";

const MALATTIA_MONTHS = new Set([10, 11, 12, 1, 2, 3]);
const MALATTIA_CHANCE = 0.1;
const MATERNITA_CHANCE = 0.02;
const PATERNITA_CHANCE = 0.03;

const pushLog = (state: GameState, tone: "good" | "bad" | "neutral", text: string): void => {
  state.log.unshift({
    id: state.nextId++,
    monthIdx: toMonthIndex(state.calendar),
    tone,
    text,
  });
  state.log = state.log.slice(0, 12);
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

/** Eventi personale + assenze: chiamare a fine mese prima del refresh tabellone. */
export const tickStaffEvents = (state: GameState): GameState => {
  if (state.quietMode) return state;
  const next = structuredClone(state);
  tickAbsences(next.employees);

  const idx = toMonthIndex(next.calendar);
  next.workforceMalattiaMonthIdx = null;

  const rand = rng(idx * 431 + next.monthsPlayed * 17 + next.employees.length);
  const month = next.calendar.month;

  if (MALATTIA_MONTHS.has(month) && rand() < MALATTIA_CHANCE) {
    next.workforceMalattiaMonthIdx = idx;
    pushLog(next, "bad", "Malattie in azienda: forza lavoro −15% questo mese.");
  }

  if (month === 7 || month === 8) {
    pushLog(next, "neutral", "Ferie estive: forza lavoro −50% (luglio–agosto).");
  }
  if (month === 12) {
    pushLog(next, "neutral", "Festività natalizie: forza lavoro −10% (dicembre).");
  }

  for (const emp of next.employees) {
    if (emp.absence) continue;
    const r = rand();
    if (emp.gender === "F" && r < MATERNITA_CHANCE) {
      emp.absence = { kind: "maternita", monthsLeft: 6 };
      pushLog(
        next,
        "neutral",
        `${emp.role} in maternità (6 mesi): percepisce stipendio ma 0 FL.`,
      );
      continue;
    }
    if (emp.gender === "M" && r < PATERNITA_CHANCE) {
      emp.absence = { kind: "paternita", monthsLeft: 1 };
      pushLog(
        next,
        "neutral",
        `${emp.role} in paternità (1 mese): FL ridotta del 50%.`,
      );
    }
  }

  return next;
};

/** Genere didattico deterministico alla assunzione. */
export const rollEmployeeGender = (state: GameState): "M" | "F" => {
  const u = rng(state.nextId * 19 + toMonthIndex(state.calendar) * 7)();
  return u < 0.5 ? "M" : "F";
};

export const absenceLabel = (emp: Employee): string | null => {
  if (!emp.absence) return null;
  if (emp.absence.kind === "maternita") {
    return `maternità (${emp.absence.monthsLeft} mesi)`;
  }
  return `paternità (${emp.absence.monthsLeft} mese/i)`;
};
