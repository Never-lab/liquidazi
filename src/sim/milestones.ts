import { HOLDING_SLOT_BASE, HOLDING_SLOT_MAX } from "../config/holding";
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
    blurb: "Tieni la compliance fiscale almeno a 80.",
    tier: "mid",
  },
  {
    id: "survive_24",
    label: "24 mesi — soft win",
    blurb: "Raggiungi il traguardo dei 24 mesi.",
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
