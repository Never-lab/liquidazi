import { HOLDING_SLOT_BASE, HOLDING_SLOT_MAX } from "../config/holding";
import { UPGRADE_LIST, upgradeLevel } from "../config/upgrades";
import { migrateUpgradeState } from "./migrateUpgrades";
import type { GameState, MilestoneId, MonthCloseSummary } from "./types";

export type MilestoneTier = "early" | "mid" | "platino";

export type MilestoneDef = {
  id: MilestoneId;
  label: string;
  blurb: string;
  tier: MilestoneTier;
};

export const MILESTONE_DEFS: MilestoneDef[] = [
  {
    id: "first_invoice",
    label: "Prima fattura",
    blurb: "Accetta una vendita dal tabellone.",
    tier: "early",
  },
  {
    id: "first_f24",
    label: "Primo F24",
    blurb: "Paga il primo versamento F24.",
    tier: "early",
  },
  {
    id: "first_month_profit",
    label: "Mese in plus",
    blurb: "Chiudi un mese con Δ cassa positivo.",
    tier: "early",
  },
  {
    id: "first_hire",
    label: "Prima assunzione",
    blurb: "Assumi il primo dipendente.",
    tier: "early",
  },
  {
    id: "first_upgrade",
    label: "Primo upgrade",
    blurb: "Compra il primo miglioramento azienda.",
    tier: "early",
  },
  {
    id: "first_treasury",
    label: "Prima tesoreria",
    blurb: "Parcheggia cassa in tesoreria.",
    tier: "early",
  },
  {
    id: "survive_3",
    label: "Trimestre in piedi",
    blurb: "Sopravvivi 3 mesi.",
    tier: "early",
  },
  {
    id: "survive_6",
    label: "Semestre in piedi",
    blurb: "Sopravvivi 6 mesi.",
    tier: "mid",
  },
  {
    id: "first_loan",
    label: "Primo mutuo",
    blurb: "Ottieni un mutuo dalla banca.",
    tier: "mid",
  },
  {
    id: "first_fido",
    label: "Primo fido",
    blurb: "Apri un fido di cassa.",
    tier: "mid",
  },
  {
    id: "first_project",
    label: "Primo progetto",
    blurb: "Accetta un piano investimenti annuale.",
    tier: "mid",
  },
  {
    id: "staff_5",
    label: "Team da 5",
    blurb: "Arriva a 5 dipendenti in organico.",
    tier: "mid",
  },
  {
    id: "holding_3",
    label: "Holding ×3",
    blurb: "Possiedi 3 partecipate insieme.",
    tier: "mid",
  },
  {
    id: "cash_25k",
    label: "Cassa 25k",
    blurb: "Raggiungi 25.000 € di picco cassa.",
    tier: "mid",
  },
  {
    id: "pa_client",
    label: "Cliente PA",
    blurb: "Accetta una commessa pubblica (PA).",
    tier: "mid",
  },
  {
    id: "growth_reinvest",
    label: "Reinvestimento",
    blurb: "Metti almeno 3.500 € in crescita (+slot).",
    tier: "mid",
  },
  {
    id: "compliance_100",
    label: "Compliance piena",
    blurb: "Tieni la compliance a 100 dopo almeno 3 mesi.",
    tier: "mid",
  },
  {
    id: "survive_12",
    label: "12 mesi in piedi",
    blurb: "Sopravvivi un anno solare di gioco.",
    tier: "mid",
  },
  {
    id: "year1_profit",
    label: "Utile Y1",
    blurb: "Chiudi il primo bilancio con utile fiscale > 0.",
    tier: "mid",
  },
  {
    id: "first_acquisition",
    label: "Prima acquisizione",
    blurb: "Compra la prima partecipata dal tabellone.",
    tier: "mid",
  },
  {
    id: "compliance_80",
    label: "Compliance ≥ 80",
    blurb: "Tieni la compliance fiscale almeno a 80 (dal 6° mese).",
    tier: "mid",
  },
  {
    id: "survive_24",
    label: "24 mesi — soft win",
    blurb: "Raggiungi il traguardo dei 24 mesi.",
    tier: "platino",
  },
  {
    id: "survive_36",
    label: "36 mesi",
    blurb: "Tre anni di attività continuativa.",
    tier: "platino",
  },
  {
    id: "cash_100k",
    label: "Cassa 100k",
    blurb: "Raggiungi 100.000 € di picco cassa.",
    tier: "platino",
  },
  {
    id: "staff_10",
    label: "Team da 10",
    blurb: "Arriva a 10 dipendenti in organico.",
    tier: "platino",
  },
  {
    id: "holding_6",
    label: "Holding ×6",
    blurb: "Possiedi 6 partecipate insieme.",
    tier: "platino",
  },
];

export const milestoneLabel = (id: MilestoneId): string =>
  MILESTONE_DEFS.find((d) => d.id === id)?.label ?? id;

export const milestoneBlurb = (id: MilestoneId): string =>
  MILESTONE_DEFS.find((d) => d.id === id)?.blurb ?? "";

export type ObjectiveRow = MilestoneDef & { done: boolean };

/** Incomplete objectives first (catalog order), capped. */
export const nextObjectives = (game: GameState, limit = 3): ObjectiveRow[] => {
  const done = new Set(game.milestones ?? []);
  return MILESTONE_DEFS.filter((d) => !done.has(d.id))
    .slice(0, limit)
    .map((d) => ({ ...d, done: false }));
};

export const platinumProgress = (
  unlocked: readonly string[],
): { done: number; total: number; pct: number } => {
  const set = new Set(unlocked);
  const done = MILESTONE_DEFS.filter((d) => set.has(d.id)).length;
  const total = MILESTONE_DEFS.length;
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
};

const hasAnyUpgrade = (game: GameState): boolean => {
  const levels = migrateUpgradeState(game);
  return UPGRADE_LIST.some((u) => upgradeLevel(levels, u.id) >= 1);
};

export const unlockMilestones = (
  state: GameState,
): { state: GameState; unlocked: MilestoneId[] } => {
  const next = structuredClone(state);
  next.milestones ??= [];
  const unlocked: MilestoneId[] = [];
  const has = (id: MilestoneId) => next.milestones.includes(id);
  const add = (id: MilestoneId) => {
    if (!has(id)) {
      next.milestones.push(id);
      unlocked.push(id);
    }
  };

  if (next.invoices.some((i) => i.kind === "AR")) add("first_invoice");
  if (
    Boolean(next.career.firstWinCelebrated) ||
    next.liabilities.some((l) => l.paid)
  ) {
    add("first_f24");
  }
  if (
    next.monthsPlayed >= 1 &&
    next.lastCloseSummary &&
    next.lastCloseSummary.delta > 0
  ) {
    add("first_month_profit");
  }
  if (next.employees.length > 0) add("first_hire");
  if (hasAnyUpgrade(next)) add("first_upgrade");
  if ((next.treasury ?? 0) > 0) add("first_treasury");
  if (next.monthsPlayed >= 3) add("survive_3");
  if (next.monthsPlayed >= 6) add("survive_6");

  if ((next.loans?.length ?? 0) > 0 || next.loan) add("first_loan");
  if (next.fido) add("first_fido");
  if (next.activeProject) add("first_project");
  if (next.employees.length >= 5) add("staff_5");
  if ((next.subsidiaries ?? []).length >= 3) add("holding_3");
  if (next.career.peakCash >= 25_000) add("cash_25k");
  if (next.invoices.some((i) => i.kind === "AR" && i.clientType === "pa")) {
    add("pa_client");
  }
  if ((next.growthInvested ?? 0) >= 3500) add("growth_reinvest");
  if (next.monthsPlayed >= 3 && next.compliance >= 100) add("compliance_100");

  if (next.monthsPlayed >= 12) add("survive_12");
  if (
    next.lastYearReport &&
    next.lastYearReport.profit > 0 &&
    next.yearReports.some((r) => r.year === next.lastYearReport!.year)
  ) {
    add("year1_profit");
  }
  if ((next.subsidiaries ?? []).length > 0) add("first_acquisition");
  if (next.monthsPlayed >= 6 && next.compliance >= 80) add("compliance_80");

  if (next.career.year2Reached || next.monthsPlayed >= 24) add("survive_24");
  if (next.monthsPlayed >= 36) add("survive_36");
  if (next.career.peakCash >= 100_000) add("cash_100k");
  if (next.employees.length >= 10) add("staff_10");
  if ((next.subsidiaries ?? []).length >= 6) add("holding_6");

  const bump = (n: number) => {
    next.holdingSlotCap = Math.min(
      HOLDING_SLOT_MAX,
      Math.max(next.holdingSlotCap ?? HOLDING_SLOT_BASE, n),
    );
  };
  if (has("first_acquisition")) bump(5);
  if (has("survive_12")) bump(6);
  if (has("year1_profit")) bump(7);
  if (has("compliance_80")) bump(8);

  return { state: next, unlocked };
};

export const formatCloseToast = (summary: MonthCloseSummary): string => {
  const sign = summary.delta >= 0 ? "+" : "";
  const mood =
    summary.delta >= 800 ? "Mese solido" : summary.delta >= 0 ? "Mese chiuso" : "Mese in perdita";
  const top = summary.lines
    .filter((l) => Math.abs(l.amount) >= 1)
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, 3)
    .map((l) => `${l.label} ${l.amount >= 0 ? "+" : ""}${Math.round(l.amount)}`)
    .join(" · ");
  return top
    ? `${mood} ${sign}${Math.round(summary.delta)} € · ${top}`
    : `${mood} · cassa ${sign}${Math.round(summary.delta)} €`;
};
