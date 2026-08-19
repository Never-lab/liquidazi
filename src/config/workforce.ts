import type { StaffRole } from "./staffPay";
import type { MarketLayer } from "../sim/types";

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

/** FL richiesta da commessa locale / privata (netto del mese). */
export const workforceRequiredForNet = (net: number): number =>
  Math.max(12, Math.round(10 + net / 70));

export type WorkforceSaleOpts = {
  marketLayer?: MarketLayer;
  /** Durata commessa in mesi (appalti PA multi-mese). */
  termMonths?: number;
};

/**
 * FL per accettare una vendita. Gli appalti PA usano la fetta mensile del netto,
 * non l'intero importo pluriennale (evita 400+ FL in early game).
 */
export const workforceRequiredForSale = (
  net: number,
  opts?: WorkforceSaleOpts,
): number => {
  const layer = opts?.marketLayer ?? "local";
  const terms = Math.max(1, opts?.termMonths ?? 1);

  if (layer === "local") {
    return workforceRequiredForNet(net);
  }

  const monthlyNet = net / terms;
  const base = workforceRequiredForNet(monthlyNet);

  if (layer === "municipal") {
    return Math.min(85, Math.max(28, Math.round(base * 1.05)));
  }

  return Math.min(110, Math.max(35, Math.round(base * 1.15)));
};
