import type { EmployeeGender, StaffAbsenceKind } from "../sim/types";

/** Moltiplicatore FL del dipendente in assenza (0 = assente, 0.5 = mezzo turno). */
export const absenceFlMult = (kind: StaffAbsenceKind): number => {
  switch (kind) {
    case "permesso":
    case "paternita":
    case "allattamento":
    case "congedo_parentale":
      return 0.5;
    default:
      return 0;
  }
};

/** Malattia individuale: max mesi cumulati per dipendente nell'anno solare. */
export const SICK_LEAVE_MAX_MONTHS_PER_YEAR = 6;

/** Eventi personale (assenze, stagionali, scelte) richiedono almeno N dipendenti. */
export const MIN_EMPLOYEES_FOR_STAFF_EVENTS = 2;

export const staffEventsEligible = (employeeCount: number): boolean =>
  employeeCount >= MIN_EMPLOYEES_FOR_STAFF_EVENTS;

export type StaffEventTemplate = {
  id: string;
  kind: StaffAbsenceKind;
  /** Durata fissa o random (mesi). */
  months: number | ((rand: () => number) => number);
  gender?: EmployeeGender;
  weight: number;
  title: (role: string) => string;
  body: (role: string, months: number) => string;
  optionLabel: string;
  eligible?: (opts: {
    sickMonthsYtd: number;
    months: number;
  }) => boolean;
};

export const STAFF_EVENT_TEMPLATES: StaffEventTemplate[] = [
  {
    id: "staff_malattia",
    kind: "malattia",
    months: (rand) => (rand() < 0.6 ? 1 : 2),
    weight: 3,
    title: (role) => `Malattia · ${role}`,
    body: (role, m) =>
      `${role} con certificato medico (${m} ${m === 1 ? "mese" : "mesi"}): percepisce stipendio ma 0 FL. Max ${SICK_LEAVE_MAX_MONTHS_PER_YEAR} mesi/anno per persona.`,
    optionLabel: "Copri internamente",
    eligible: ({ sickMonthsYtd, months }) => sickMonthsYtd + months <= SICK_LEAVE_MAX_MONTHS_PER_YEAR,
  },
  {
    id: "staff_permesso",
    kind: "permesso",
    months: 1,
    weight: 2,
    title: (role) => `Permesso · ${role}`,
    body: (role) =>
      `${role} chiede permesso (es. visite, RUP): 1 mese a FL ridotta del 50% (didattico).`,
    optionLabel: "Ok, organizza il turno",
  },
  {
    id: "staff_ferie",
    kind: "ferie",
    months: 1,
    weight: 2,
    title: (role) => `Ferie · ${role}`,
    body: (role) => `${role} in ferie individuali (1 mese): 0 FL finché non rientra.`,
    optionLabel: "Approva ferie",
  },
  {
    id: "staff_maternita",
    kind: "maternita",
    months: 6,
    gender: "F",
    weight: 1,
    title: (role) => `Maternità · ${role}`,
    body: (role) =>
      `${role} in maternità (6 mesi): stipendio INPS simulato, 0 FL fino al rientro.`,
    optionLabel: "Gestisci copertura",
  },
  {
    id: "staff_paternita",
    kind: "paternita",
    months: 1,
    gender: "M",
    weight: 1,
    title: (role) => `Paternità · ${role}`,
    body: (role) =>
      `${role} in paternità (1 mese, ~15 giorni didattici): FL ridotta del 50%.`,
    optionLabel: "Ok",
  },
  {
    id: "staff_allattamento",
    kind: "allattamento",
    months: 2,
    gender: "F",
    weight: 1,
    title: (role) => `Allattamento · ${role}`,
    body: (role) =>
      `${role} in permesso allattamento (2 mesi): FL ridotta del 50%.`,
    optionLabel: "Ok",
  },
  {
    id: "staff_congedo_parentale",
    kind: "congedo_parentale",
    months: 3,
    weight: 1,
    title: (role) => `Congedo parentale · ${role}`,
    body: (role) =>
      `${role} in congedo parentale (3 mesi): FL ridotta del 50%.`,
    optionLabel: "Ok",
  },
  {
    id: "staff_permesso_104",
    kind: "permesso_104",
    months: 1,
    weight: 1,
    title: (role) => `Permesso 104 · ${role}`,
    body: (role) =>
      `${role} assiste familiare con disabilità (legge 104): 1 mese, 0 FL.`,
    optionLabel: "Ok",
  },
];
