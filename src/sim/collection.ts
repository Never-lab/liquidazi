import {
  COMPLIANCE_CARTELLA,
  COMPLIANCE_IGNORE,
  COMPLIANCE_PAY_CLOSE,
  MONTHLY_MORA_RATE,
  MONTHS_BEFORE_CARTELLA,
  RATEATION_FEE,
  RATEATION_MONTHS,
} from "../config/collection";
import { round2, toMonthIndex, type GameState } from "./types";
import type { TaxLiability } from "./types";

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
    state.monthsTaxOverdue = (state.monthsTaxOverdue ?? 0) + 1;
  } else {
    state.monthsTaxOverdue = 0;
  }
};

export const markOverdueLiabilitiesPaid = (state: GameState): void => {
  const idx = toMonthIndex(state.calendar);
  for (const l of state.liabilities) {
    if (!l.paid && l.dueIdx <= idx) {
      l.paid = true;
    }
  }
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

export const maybeOpenCartella = (state: GameState): void => {
  if (state.collectionCase != null) return;
  if ((state.monthsTaxOverdue ?? 0) < MONTHS_BEFORE_CARTELLA) return;

  const idx = toMonthIndex(state.calendar);
  const principal = overdueTotal(state, idx);
  if (principal <= 0) return;

  state.collectionCase = {
    stage: "cartella",
    principal,
    monthsInStage: 0,
    firstOverdueIdx: idx,
  };
  state.compliance = Math.max(0, state.compliance - COMPLIANCE_CARTELLA);
  state.pendingEvent = {
    id: CARTELLA_EVENT_ID,
    title: "Cartella di pagamento",
    body: `Debito fiscale in riscossione: ${principal.toLocaleString("it-IT")} €. Paga, rateizza (12 mesi +10%) o ignora (pignoramento).`,
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

  next.pendingEvent = null;

  if (optionId === "pay_all") {
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
