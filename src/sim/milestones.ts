import { HOLDING_SLOT_BASE, HOLDING_SLOT_MAX } from "../config/holding";
import { UPGRADE_LIST, upgradeLevel, type UpgradeId } from "../config/upgrades";
import { migrateUpgradeState } from "./migrateUpgrades";
import { pressureBand } from "./rival";
import type { GameState, MilestoneId, MonthCloseSummary } from "./types";

export type MilestoneTier = "early" | "mid" | "platino";

export type MilestoneDef = {
  id: MilestoneId;
  label: string;
  blurb: string;
  tier: MilestoneTier;
};

/** ~55–60 glory trophies — no sim formula changes; holding bumps only on legacy mid ids. */
export const MILESTONE_DEFS: MilestoneDef[] = [
  // —— early ——
  { id: "first_invoice", label: "Prima fattura", blurb: "Accetta una vendita dal tabellone.", tier: "early" },
  { id: "first_f24", label: "Primo F24", blurb: "Paga il primo versamento F24.", tier: "early" },
  { id: "first_month_profit", label: "Mese in plus", blurb: "Chiudi un mese con Δ cassa positivo.", tier: "early" },
  { id: "first_close", label: "Primo mese chiuso", blurb: "Chiudi il primo mese di attività.", tier: "early" },
  { id: "first_hire", label: "Prima assunzione", blurb: "Assumi il primo dipendente.", tier: "early" },
  { id: "hire_impiegato", label: "Primo impiegato", blurb: "Assumi un Impiegato.", tier: "early" },
  { id: "hire_responsabile", label: "Primo responsabile", blurb: "Assumi un Responsabile.", tier: "early" },
  { id: "first_upgrade", label: "Primo upgrade", blurb: "Compra il primo miglioramento azienda.", tier: "early" },
  { id: "first_treasury", label: "Prima tesoreria", blurb: "Parcheggia cassa in tesoreria.", tier: "early" },
  { id: "survive_3", label: "Trimestre in piedi", blurb: "Sopravvivi 3 mesi.", tier: "early" },
  { id: "cash_10k", label: "Cassa 10k", blurb: "Raggiungi 10.000 € di picco cassa.", tier: "early" },
  { id: "supply_stocked", label: "Scorte a posto", blurb: "Tieni almeno 3 mesi di scorte.", tier: "early" },
  { id: "private_client", label: "Cliente privato", blurb: "Accetta una commessa da cliente privato.", tier: "early" },

  // —— mid ——
  { id: "survive_6", label: "Semestre in piedi", blurb: "Sopravvivi 6 mesi.", tier: "mid" },
  { id: "first_loan", label: "Primo mutuo", blurb: "Ottieni un mutuo dalla banca.", tier: "mid" },
  { id: "dual_loans", label: "Due mutui", blurb: "Tieni aperti due mutui insieme.", tier: "mid" },
  { id: "first_fido", label: "Primo fido", blurb: "Apri un fido di cassa.", tier: "mid" },
  { id: "fido_drawn", label: "Fido usato", blurb: "Utilizza il fido (scoperto accordato).", tier: "mid" },
  { id: "distress_loan", label: "Salvataggio", blurb: "Accetta un prestito di salvataggio.", tier: "mid" },
  { id: "first_project", label: "Primo progetto", blurb: "Accetta un piano investimenti annuale.", tier: "mid" },
  { id: "project_digitalizzazione", label: "Progetto digitalizzazione", blurb: "Avvia il piano Digitalizzazione.", tier: "mid" },
  { id: "project_magazzino", label: "Progetto magazzino", blurb: "Avvia il piano Magazzino.", tier: "mid" },
  { id: "project_formazione", label: "Progetto formazione", blurb: "Avvia il piano Formazione.", tier: "mid" },
  { id: "project_espansione", label: "Progetto espansione", blurb: "Avvia Espansione commerciale.", tier: "mid" },
  { id: "staff_3", label: "Team da 3", blurb: "Arriva a 3 dipendenti.", tier: "mid" },
  { id: "staff_5", label: "Team da 5", blurb: "Arriva a 5 dipendenti.", tier: "mid" },
  { id: "holding_2", label: "Holding ×2", blurb: "Possiedi 2 partecipate.", tier: "mid" },
  { id: "holding_3", label: "Holding ×3", blurb: "Possiedi 3 partecipate.", tier: "mid" },
  { id: "cash_25k", label: "Cassa 25k", blurb: "Raggiungi 25.000 € di picco cassa.", tier: "mid" },
  { id: "pa_client", label: "Cliente PA", blurb: "Accetta una commessa pubblica (PA).", tier: "mid" },
  { id: "growth_reinvest", label: "Reinvestimento", blurb: "Metti almeno 3.500 € in crescita.", tier: "mid" },
  { id: "compliance_100", label: "Compliance piena", blurb: "Compliance a 100 dopo almeno 3 mesi.", tier: "mid" },
  { id: "upgrade_gestionale", label: "Gestionale F24", blurb: "Compra Gestionale F24.", tier: "mid" },
  { id: "upgrade_commerciale", label: "Ufficio commerciale", blurb: "Compra Ufficio commerciale.", tier: "mid" },
  { id: "upgrade_sede", label: "Sede / arredi", blurb: "Compra Sede / arredi.", tier: "mid" },
  { id: "upgrade_processi", label: "Processi interni", blurb: "Compra Processi interni.", tier: "mid" },
  { id: "upgrade_any_l2", label: "Upgrade Lv2", blurb: "Porta un upgrade al livello 2.", tier: "mid" },
  { id: "revenue_50k", label: "Fatturato 50k", blurb: "50.000 € di ricavi lifetime.", tier: "mid" },
  { id: "rival_tesa", label: "Rivale tesa", blurb: "Vivi la pressione rivale in banda Tesa.", tier: "mid" },
  { id: "demand_boom", label: "Boom di domanda", blurb: "Affronta un mese di boom sul tabellone.", tier: "mid" },
  { id: "demand_secca", label: "Mercato in secca", blurb: "Affronta un mese di secca.", tier: "mid" },
  { id: "cartella_open", label: "Cartella aperta", blurb: "Ricevi una cartella di riscossione.", tier: "mid" },
  { id: "rateazione", label: "Rateazione", blurb: "Attiva un piano di rateazione.", tier: "mid" },
  { id: "survive_12", label: "12 mesi in piedi", blurb: "Sopravvivi un anno solare.", tier: "mid" },
  { id: "year1_profit", label: "Utile Y1", blurb: "Primo bilancio con utile fiscale > 0.", tier: "mid" },
  { id: "first_acquisition", label: "Prima acquisizione", blurb: "Compra la prima partecipata.", tier: "mid" },
  { id: "compliance_80", label: "Compliance ≥ 80", blurb: "Compliance ≥ 80 dal 6° mese.", tier: "mid" },

  // —— platino ——
  { id: "survive_24", label: "24 mesi — soft win", blurb: "Traguardo dei 24 mesi.", tier: "platino" },
  { id: "survive_36", label: "36 mesi", blurb: "Tre anni di attività.", tier: "platino" },
  { id: "cash_100k", label: "Cassa 100k", blurb: "100.000 € di picco cassa.", tier: "platino" },
  { id: "staff_10", label: "Team da 10", blurb: "10 dipendenti in organico.", tier: "platino" },
  { id: "holding_6", label: "Holding ×6", blurb: "6 partecipate insieme.", tier: "platino" },
  { id: "holding_8", label: "Holding piena", blurb: "8 partecipate (cap massimo).", tier: "platino" },
  { id: "upgrades_all_l1", label: "Tutti gli upgrade", blurb: "Compra tutti e 4 gli upgrade (Lv1+).", tier: "platino" },
  { id: "upgrade_any_l3", label: "Upgrade Lv3", blurb: "Porta un upgrade al livello 3.", tier: "platino" },
  { id: "growth_3_slots", label: "Crescita ×3", blurb: "Accumula almeno 10.500 € in crescita.", tier: "platino" },
  { id: "revenue_200k", label: "Fatturato 200k", blurb: "200.000 € di ricavi lifetime.", tier: "platino" },
  { id: "rival_guerra", label: "Guerra rivale", blurb: "Sopravvivi alla pressione Guerra.", tier: "platino" },
  { id: "enforcement", label: "Pignoramento", blurb: "Arrivi allo stadio di pignoramento.", tier: "platino" },
  { id: "treasury_10k", label: "Tesoreria 10k", blurb: "Tieni almeno 10.000 € in tesoreria.", tier: "platino" },
];

export const milestoneLabel = (id: MilestoneId): string =>
  MILESTONE_DEFS.find((d) => d.id === id)?.label ?? id;

export const milestoneBlurb = (id: MilestoneId): string =>
  MILESTONE_DEFS.find((d) => d.id === id)?.blurb ?? "";

export type ObjectiveRow = MilestoneDef & { done: boolean };

export const nextObjectives = (game: GameState, limit = 3): ObjectiveRow[] => {
  const done = new Set(game.milestones ?? []);
  return MILESTONE_DEFS.filter((d) => !done.has(d.id))
    .slice(0, limit)
    .map((d) => ({ ...d, done: false }));
};

/** Popup/toast: skip trophies already on the account (new run). */
export const unseenUnlocks = (
  unlocked: readonly MilestoneId[],
  accountOwned: readonly MilestoneId[],
): MilestoneId[] => {
  if (accountOwned.length === 0) return [...unlocked];
  const owned = new Set(accountOwned);
  return unlocked.filter((id) => !owned.has(id));
};

export const platinumProgress = (
  unlocked: readonly string[],
): { done: number; total: number; pct: number } => {
  const set = new Set(unlocked);
  const done = MILESTONE_DEFS.filter((d) => set.has(d.id)).length;
  const total = MILESTONE_DEFS.length;
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
};

const lvl = (game: GameState, id: UpgradeId): number =>
  upgradeLevel(migrateUpgradeState(game), id);

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

  const nEmp = next.employees.length;
  const nSub = (next.subsidiaries ?? []).length;
  const peak = next.career.peakCash;
  const rev = next.career.lifetimeRevenue;
  const growth = next.growthInvested ?? 0;
  const treasury = next.treasury ?? 0;
  const loans = next.loans?.length ?? (next.loan ? 1 : 0);
  const rivalHeat = next.rival?.heat ?? 0;
  const band = pressureBand(rivalHeat);
  const projectId = next.activeProject?.id;
  const caseStage = next.collectionCase?.stage;

  if (next.invoices.some((i) => i.kind === "AR")) add("first_invoice");
  if (next.invoices.some((i) => i.kind === "AR" && i.clientType === "private")) {
    add("private_client");
  }
  if (next.invoices.some((i) => i.kind === "AR" && i.clientType === "pa")) {
    add("pa_client");
  }
  if (
    Boolean(next.career.firstWinCelebrated) ||
    next.liabilities.some((l) => l.paid)
  ) {
    add("first_f24");
  }
  if (next.monthsPlayed >= 1) add("first_close");
  if (
    next.monthsPlayed >= 1 &&
    next.lastCloseSummary &&
    next.lastCloseSummary.delta > 0
  ) {
    add("first_month_profit");
  }
  if (nEmp > 0) add("first_hire");
  if (next.employees.some((e) => e.role === "Impiegato")) add("hire_impiegato");
  if (next.employees.some((e) => e.role === "Responsabile")) add("hire_responsabile");
  if (UPGRADE_LIST.some((u) => lvl(next, u.id) >= 1)) add("first_upgrade");
  if (treasury > 0) add("first_treasury");
  if ((next.supplyMonths ?? 0) >= 3) add("supply_stocked");
  if (peak >= 10_000) add("cash_10k");
  if (next.monthsPlayed >= 3) add("survive_3");

  if (next.monthsPlayed >= 6) add("survive_6");
  if (loans >= 1) add("first_loan");
  if (loans >= 2) add("dual_loans");
  if (next.fido) add("first_fido");
  if ((next.fido?.drawn ?? 0) > 0) add("fido_drawn");
  if (next.distressLoanTaken) add("distress_loan");
  if (projectId) {
    add("first_project");
    if (projectId === "digitalizzazione") add("project_digitalizzazione");
    if (projectId === "magazzino") add("project_magazzino");
    if (projectId === "formazione") add("project_formazione");
    if (projectId === "espansione_commerciale") add("project_espansione");
  }
  if (nEmp >= 3) add("staff_3");
  if (nEmp >= 5) add("staff_5");
  if (nSub >= 2) add("holding_2");
  if (nSub >= 3) add("holding_3");
  if (peak >= 25_000) add("cash_25k");
  if (growth >= 3500) add("growth_reinvest");
  if (next.monthsPlayed >= 3 && next.compliance >= 100) add("compliance_100");
  if (lvl(next, "gestionale_f24") >= 1) add("upgrade_gestionale");
  if (lvl(next, "commerciale") >= 1) add("upgrade_commerciale");
  if (lvl(next, "sede") >= 1) add("upgrade_sede");
  if (lvl(next, "processi") >= 1) add("upgrade_processi");
  if (UPGRADE_LIST.some((u) => lvl(next, u.id) >= 2)) add("upgrade_any_l2");
  if (rev >= 50_000) add("revenue_50k");
  if (band === "tesa" || band === "guerra") add("rival_tesa");
  if (next.demandRegime === "boom") add("demand_boom");
  if (next.demandRegime === "secca") add("demand_secca");
  if (caseStage) add("cartella_open");
  if (caseStage === "rateazione") add("rateazione");
  if (next.monthsPlayed >= 12) add("survive_12");
  if (
    next.lastYearReport &&
    next.lastYearReport.profit > 0 &&
    next.yearReports.some((r) => r.year === next.lastYearReport!.year)
  ) {
    add("year1_profit");
  }
  if (nSub > 0) add("first_acquisition");
  if (next.monthsPlayed >= 6 && next.compliance >= 80) add("compliance_80");

  if (next.career.year2Reached || next.monthsPlayed >= 24) add("survive_24");
  if (next.monthsPlayed >= 36) add("survive_36");
  if (peak >= 100_000) add("cash_100k");
  if (nEmp >= 10) add("staff_10");
  if (nSub >= 6) add("holding_6");
  if (nSub >= 8) add("holding_8");
  if (UPGRADE_LIST.every((u) => lvl(next, u.id) >= 1)) add("upgrades_all_l1");
  if (UPGRADE_LIST.some((u) => lvl(next, u.id) >= 3)) add("upgrade_any_l3");
  if (growth >= 10_500) add("growth_3_slots");
  if (rev >= 200_000) add("revenue_200k");
  if (band === "guerra") add("rival_guerra");
  if (caseStage === "enforcement" || caseStage === "terminal") add("enforcement");
  if (treasury >= 10_000) add("treasury_10k");

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
