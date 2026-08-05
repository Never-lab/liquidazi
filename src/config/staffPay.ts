import type { SectorId } from "./market";
import { fiscalYearSnapshot as snap } from "./fiscalYearSnapshot";
import { round2 } from "../sim/types";

export type StaffRole = "Operaio" | "Impiegato" | "Responsabile";

export const MAX_SENIORITY_STEPS = 5;
export const SENIORITY_MONTHS = 24;
export const SENIORITY_BUMP = 1.04;

/** Punti capacità per ruolo (sommati in monthlyCapacity). */
export const CAPACITY_POINTS: Record<StaffRole, number> = {
  Operaio: 1,
  Impiegato: 0.35,
  Responsabile: 0.5,
};

/** Lordo base mese 0 per settore (ordine di grandezza CCNL PMI didattico). */
export const CCNL_BASE_GROSS: Record<SectorId, Record<StaffRole, number>> = {
  servizi: { Operaio: 1650, Impiegato: 2150, Responsabile: 3450 },
  commercio: { Operaio: 1600, Impiegato: 2100, Responsabile: 3400 },
  artigianato: { Operaio: 1700, Impiegato: 2050, Responsabile: 3300 },
  ristorazione: { Operaio: 1550, Impiegato: 2000, Responsabile: 3200 },
};

export const STAFF_ROLES: ReadonlyArray<{
  role: StaffRole;
  blurb: string;
}> = [
  { role: "Operaio", blurb: "+1 slot consegne" },
  {
    role: "Impiegato",
    blurb: "+0.35 slot, più lead e ticket più alti",
  },
  {
    role: "Responsabile",
    blurb: "+0.5 slot, +compliance/mese, −heat rivale",
  },
];

export const capacityPointsFor = (role: string): number =>
  CAPACITY_POINTS[role as StaffRole] ?? 0;

export const baseGrossFor = (sector: SectorId, role: StaffRole): number =>
  CCNL_BASE_GROSS[sector][role];

export const grossWithSeniority = (base: number, steps: number): number => {
  const s = Math.max(0, Math.min(MAX_SENIORITY_STEPS, steps));
  return round2(base * SENIORITY_BUMP ** s);
};

/** Costo azienda stimato (INPS datore + accantonamento TFR) sul lordo. */
export const employerCostMonthly = (gross: number): number =>
  round2(
    gross * (1 + snap.inps_employer_rate) + gross * snap.tfr_accrual_factor,
  );
