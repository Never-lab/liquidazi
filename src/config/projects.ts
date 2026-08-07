/** Annual investment projects — one active at a time, offered each January. */

export type ProjectId =
  | "digitalizzazione"
  | "magazzino"
  | "formazione"
  | "espansione_commerciale";

export type ProjectDef = {
  id: ProjectId;
  label: string;
  blurb: string;
  cost: number;
  durationMonths: number;
  capacityBonus: number;
  ticketMult: number;
  compliancePerMonth: number;
  rentFactor: number;
  slotPenalty: number;
  frozenCash: number;
};

export const PROJECTS: Record<ProjectId, ProjectDef> = {
  digitalizzazione: {
    id: "digitalizzazione",
    label: "Digitalizzazione",
    blurb: "Gestionale e fatturazione elettronica: +1 slot e +1 compliance al mese.",
    cost: 6000,
    durationMonths: 9,
    capacityBonus: 1,
    ticketMult: 1,
    compliancePerMonth: 1,
    rentFactor: 1,
    slotPenalty: 0,
    frozenCash: 0,
  },
  magazzino: {
    id: "magazzino",
    label: "Magazzino / logistica",
    blurb: "Affitto magazzino: canone −5% per 12 mesi; 2 000 € vincolati fino a fine cantiere.",
    cost: 8000,
    durationMonths: 12,
    capacityBonus: 0,
    ticketMult: 1,
    compliancePerMonth: 0,
    rentFactor: 0.95,
    slotPenalty: 0,
    frozenCash: 2000,
  },
  formazione: {
    id: "formazione",
    label: "Formazione team",
    blurb: "Percorso interno: +2 compliance al mese per 6 mesi.",
    cost: 4500,
    durationMonths: 6,
    capacityBonus: 0,
    ticketMult: 1,
    compliancePerMonth: 2,
    rentFactor: 1,
    slotPenalty: 0,
    frozenCash: 0,
  },
  espansione_commerciale: {
    id: "espansione_commerciale",
    label: "Espansione commerciale",
    blurb: "Nuove commesse: ticket ×1,06 ma −1 slot capacità per 9 mesi.",
    cost: 7000,
    durationMonths: 9,
    capacityBonus: 0,
    ticketMult: 1.06,
    compliancePerMonth: 0,
    rentFactor: 1,
    slotPenalty: 1,
    frozenCash: 0,
  },
};

const PROJECT_IDS = Object.keys(PROJECTS) as ProjectId[];

export const getProjectDef = (id: ProjectId): ProjectDef => PROJECTS[id];

/** Draw 2–3 unique project ids for the annual offer. */
export const drawProjectOptions = (rand: () => number): ProjectId[] => {
  const count = 2 + Math.floor(rand() * 2);
  const pool = [...PROJECT_IDS];
  const picked: ProjectId[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(rand() * pool.length);
    picked.push(pool[idx]!);
    pool.splice(idx, 1);
  }
  return picked;
};
