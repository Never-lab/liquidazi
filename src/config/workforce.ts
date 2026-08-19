import type { StaffRole } from "./staffPay";

/** FL azienda senza dipendenti (imprenditore + collaborazioni occasionali). */
export const WORKFORCE_BASE = 30;

/** FL per ruolo (sostituisce i vecchi punti slot). */
export const WORKFORCE_BY_ROLE: Record<StaffRole, number> = {
  Operaio: 5,
  Impiegato: 8,
  Responsabile: 12,
};

/** Ogni “slot” bonus legacy (crescita, rep, processi…) vale 8 FL. */
export const WORKFORCE_PER_LEGACY_SLOT = 8;

export const workforceForRole = (role: string): number =>
  WORKFORCE_BY_ROLE[role as StaffRole] ?? 0;

/** FL richiesta da una commessa in base al netto (taratura didattica). */
export const workforceRequiredForNet = (net: number): number =>
  Math.max(12, Math.round(10 + net / 70));
