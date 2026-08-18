import {
  COMPLIANCE_CARTELLA,
  COMPLIANCE_ENFORCEMENT_CLEAR,
  COMPLIANCE_IGNORE,
  COMPLIANCE_PAY_CLOSE,
  COMPLIANCE_RATEATION_DONE,
  COMPLIANCE_SKIP_RATA,
  ENFORCEMENT_AGGIO,
  ENFORCEMENT_MONTHS_TO_TERMINAL,
  lostThreshold,
  MONTHLY_MORA_RATE,
  MONTHS_BEFORE_CARTELLA,
  RATEATION_FEE,
  RATEATION_MONTHS,
  TERMINAL_MONTHS_TO_LOST,
} from "../config/collection";
import { moraIncrement } from "./worldEvents";
import { round2, toMonthIndex, type GameState, type TaxLiability } from "./types";

export const CARTELLA_EVENT_ID = "fiscal_cartella";

export const overdueLiabilities = (state: GameState, idx: number): TaxLiability[] =>
  state.liabilities.filter((l) => !l.paid && l.dueIdx <= idx);

export const overdueTotal = (state: GameState, idx: number): number =>
  round2(overdueLiabilities(state, idx).reduce((sum, l) => sum + l.amount, 0));

export const applyMonthlyMora = (state: GameState): void => {
  if (state.collectionCase != null) return;
  const idx = toMonthIndex(state.calendar);
  for (const l of state.liabilities) {
    if (!l.paid && l.dueIdx < idx) {
      l.amount = round2(l.amount * (1 + MONTHLY_MORA_RATE));
    }
  }
};

export const updateMonthsTaxOverdue = (state: GameState): void => {
  const idx = toMonthIndex(state.calendar);
  if (overdueTotal(state, idx) > 0) {
    state.chainBoosts ??= [];
    state.monthsTaxOverdue =
      (state.monthsTaxOverdue ?? 0) + moraIncrement(state.chainBoosts, state.monthsPlayed);
  } else {
    state.monthsTaxOverdue = 0;
  }
};

/** Mark paid: snapshot ids if present, else all overdue (legacy saves). */
export const markOverdueLiabilitiesPaid = (state: GameState): void => {
  const ids = state.collectionCase?.liabilityIds;
  if (ids && ids.length > 0) {
    const set = new Set(ids);
    for (const l of state.liabilities) {
      if (!l.paid && set.has(l.id)) l.paid = true;
    }
    return;
  }
  const idx = toMonthIndex(state.calendar);
  for (const l of state.liabilities) {
    if (!l.paid && l.dueIdx <= idx) l.paid = true;
  }
};

export const f24BlockedByCollection = (state: GameState): boolean => {
  const stage = state.collectionCase?.stage;
  return stage === "cartella" || stage === "enforcement" || stage === "terminal";
};

/** Drains cash first, then treasury; returns amount actually taken. */
export const drainCashThenTreasury = (state: GameState, amount: number): number => {
  if (amount <= 0) return 0;
  state.treasury ??= 0;
  let taken = 0;
  let remaining = amount;
  const fromCash = round2(Math.min(state.company.cash, remaining));
  state.company.cash = round2(state.company.cash - fromCash);
  taken = round2(taken + fromCash);
  remaining = round2(remaining - fromCash);
  if (remaining > 0) {
    const fromTreasury = round2(Math.min(state.treasury, remaining));
    state.treasury = round2(state.treasury - fromTreasury);
    taken = round2(taken + fromTreasury);
  }
  return taken;
};

const closeCollectionCase = (state: GameState, complianceBonus: number): void => {
  markOverdueLiabilitiesPaid(state);
  state.collectionCase = null;
  state.monthsTaxOverdue = 0;
  state.compliance = Math.min(100, state.compliance + complianceBonus);
};

const applyEnforcementDrain = (state: GameState, c: NonNullable<GameState["collectionCase"]>): void => {
  const fromCash = round2(Math.min(state.company.cash, c.principal));
  state.company.cash = round2(state.company.cash - fromCash);
  let remaining = round2(c.principal - fromCash);
  state.treasury ??= 0;
  let fromTreasury = 0;
  if (remaining > 0) {
    fromTreasury = round2(Math.min(state.treasury, remaining));
    state.treasury = round2(state.treasury - fromTreasury);
    remaining = round2(remaining - fromTreasury);
  }
  const gross = round2(fromCash + fromTreasury);
  c.principal = remaining;

  const aggio = round2(gross * ENFORCEMENT_AGGIO);
  if (aggio > 0) {
    const aggioPaid = drainCashThenTreasury(state, aggio);
    const aggioResidual = round2(aggio - aggioPaid);
    if (aggioResidual > 0) {
      c.principal = round2(c.principal + aggioResidual);
    }
  }
};

export const tickCollectionCase = (state: GameState): void => {
  const c = state.collectionCase;
  if (!c) return;

  if (c.stage === "rateazione" && c.plan) {
    const { installment } = c.plan;
    state.treasury ??= 0;
    const available = round2(state.company.cash + state.treasury);
    if (available < installment) {
      c.stage = "enforcement";
      c.monthsInStage = 0;
      delete c.plan;
      state.compliance = Math.max(0, state.compliance - COMPLIANCE_SKIP_RATA);
      return;
    }
    drainCashThenTreasury(state, installment);
    c.plan.monthsLeft -= 1;
    c.principal = round2(c.principal - installment);
    if (c.plan.monthsLeft <= 0) {
      closeCollectionCase(state, COMPLIANCE_RATEATION_DONE);
    }
    return;
  }

  if (c.stage === "enforcement") {
    applyEnforcementDrain(state, c);
    c.monthsInStage += 1;
    if (c.principal <= 0) {
      closeCollectionCase(state, COMPLIANCE_ENFORCEMENT_CLEAR);
      return;
    }
    const threshold = lostThreshold(state.ytd.revenue);
    if (c.monthsInStage >= ENFORCEMENT_MONTHS_TO_TERMINAL && c.principal > threshold) {
      c.stage = "terminal";
      c.monthsInStage = 0;
    }
    return;
  }

  if (c.stage === "terminal") {
    applyEnforcementDrain(state, c);
    c.monthsInStage += 1;
    if (c.monthsInStage >= TERMINAL_MONTHS_TO_LOST && c.principal > 0) {
      state.status = "lost";
      state.loseReason = "fiscal";
    }
  }
};

export const maybeOpenCartella = (state: GameState): void => {
  if (state.collectionCase != null) return;
  if ((state.monthsTaxOverdue ?? 0) < MONTHS_BEFORE_CARTELLA) return;

  const idx = toMonthIndex(state.calendar);
  const overdue = overdueLiabilities(state, idx);
  const principal = round2(overdue.reduce((sum, l) => sum + l.amount, 0));
  if (principal <= 0) return;

  state.collectionCase = {
    stage: "cartella",
    principal,
    monthsInStage: 0,
    firstOverdueIdx: idx,
    liabilityIds: overdue.map((l) => l.id),
  };
  state.compliance = Math.max(0, state.compliance - COMPLIANCE_CARTELLA);
  state.pendingEvent = {
    id: CARTELLA_EVENT_ID,
    title: "Cartella di pagamento",
    body: `Debito fiscale in riscossione: ${principal.toLocaleString("it-IT")} €. Paga, rateizza (12 mesi +10%) o ignora (pignoramento).`,
    family: "burocratico",
    options: [
      { id: "pay_all", label: "Paga tutto" },
      { id: "rateize", label: "Rateizza (12 mesi)" },
      { id: "ignore", label: "Ignora" },
    ],
  };
  state.log.unshift({
    id: state.nextId++,
    monthIdx: idx,
    tone: "bad",
    text: `Cartella di pagamento: ${principal.toLocaleString("it-IT")} € in riscossione.`,
  });
  state.log = state.log.slice(0, 12);
};

export const resolveCartellaChoice = (state: GameState, optionId: string): GameState => {
  const next = structuredClone(state);
  const c = next.collectionCase;
  if (!c || c.stage !== "cartella") return next;

  if (optionId === "pay_all") {
    next.pendingEvent = null;
    const paid = drainCashThenTreasury(next, c.principal);
    const residual = round2(c.principal - paid);
    if (residual <= 0) {
      markOverdueLiabilitiesPaid(next);
      next.collectionCase = null;
      next.monthsTaxOverdue = 0;
      next.compliance = Math.min(100, next.compliance + COMPLIANCE_PAY_CLOSE);
    } else {
      next.collectionCase = {
        ...c,
        principal: residual,
        stage: "enforcement",
        monthsInStage: 0,
      };
    }
    return next;
  }

  if (optionId === "rateize") {
    next.pendingEvent = null;
    const total = round2(c.principal * (1 + RATEATION_FEE));
    next.collectionCase = {
      ...c,
      stage: "rateazione",
      principal: total,
      monthsInStage: 0,
      plan: {
        installment: round2(total / RATEATION_MONTHS),
        monthsLeft: RATEATION_MONTHS,
        totalMonths: RATEATION_MONTHS,
      },
    };
    return next;
  }

  if (optionId === "ignore") {
    next.pendingEvent = null;
    next.collectionCase = {
      ...c,
      stage: "enforcement",
      monthsInStage: 0,
    };
    next.compliance = Math.max(0, next.compliance - COMPLIANCE_IGNORE);
    return next;
  }

  return next;
};
