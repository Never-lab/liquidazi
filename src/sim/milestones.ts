import { HOLDING_SLOT_BASE, HOLDING_SLOT_MAX } from "../config/holding";
import type { GameState, MilestoneId, MonthCloseSummary } from "./types";

export const MILESTONE_DEFS: {
  id: MilestoneId;
  label: string;
  blurb: string;
}[] = [
  {
    id: "survive_12",
    label: "12 mesi in piedi",
    blurb: "Sopravvivi un anno solare di gioco.",
  },
  {
    id: "year1_profit",
    label: "Utile Y1",
    blurb: "Chiudi il primo bilancio con utile fiscale > 0.",
  },
  {
    id: "first_acquisition",
    label: "Prima acquisizione",
    blurb: "Compra la prima partecipata dal tabellone.",
  },
  {
    id: "compliance_80",
    label: "Compliance ≥ 80",
    blurb: "Tieni la compliance fiscale almeno a 80.",
  },
];

export const unlockMilestones = (state: GameState): { state: GameState; unlocked: MilestoneId[] } => {
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
