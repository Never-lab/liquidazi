import { fiscalYearSnapshot as snap } from "../config/fiscalYearSnapshot";
import { euriborAt } from "./actions";
import {
  LOSE_MONTHS_BELOW_ZERO,
  WIN_MONTHS,
  round2,
  toMonthIndex,
  type GameState,
  type LiabilityKind,
} from "./types";

const pushLiability = (
  state: GameState,
  kind: LiabilityKind,
  amount: number,
  dueIdx: number,
): void => {
  if (amount <= 0) return;
  state.liabilities.push({
    id: state.nextId++,
    kind,
    amount,
    dueIdx,
    paid: false,
    penalized: false,
  });
};

/**
 * Pure simulation step: closes the current month and moves the calendar
 * forward. Order of operations:
 *   1. settle invoices due (cash in/out of the gross amount)
 *   2. penalize skipped F24s (one-shot penalty + interest + compliance malus)
 *   3. payroll: pay net salaries, accrue IRPEF/INPS liabilities + TFR
 *   4. liquidate month IVA (output - input - credit) → liability due next
 *      month; cash untouched until the F24 is paid
 *   5. loan installment (constant principal share + interest)
 *   6. annual events: diritto camerale (June), acconti IRES/IRAP (May/Oct
 *      close → due June/November), year close (December) → saldo next June
 *   7. advance calendar
 *   8. win/lose check
 */
export const advanceMonth = (state: GameState): GameState => {
  if (state.status !== "running") return state;

  const next = structuredClone(state);
  const idx = toMonthIndex(next.calendar);

  // 1. invoice settlement
  for (const inv of next.invoices) {
    if (!inv.settled && inv.dueIdx <= idx) {
      inv.settled = true;
      next.company.cash = round2(
        next.company.cash + (inv.kind === "AR" ? inv.gross : -inv.gross),
      );
    }
  }

  // 1b. monthly zone rent / locale
  if (next.company.monthlyRent > 0) {
    next.company.cash = round2(next.company.cash - next.company.monthlyRent);
    next.ytd.otherCosts = round2(next.ytd.otherCosts + next.company.monthlyRent);
  }

  // 2. skipped F24s: one-shot penalty + interest + compliance malus.
  // Runs before new liabilities are pushed (those are due next month).
  for (const l of next.liabilities) {
    if (!l.paid && !l.penalized && l.dueIdx <= idx) {
      l.penalized = true;
      l.amount = round2(l.amount * (1 + snap.penalty_late_pct + snap.interest_late_pct));
      next.compliance = Math.max(0, next.compliance - snap.compliance_malus_late);
    }
  }

  // 3. payroll (cedolino semplificato: ritenute flat sul lordo)
  if (next.employees.length > 0) {
    let totalGross = 0;
    let totalNet = 0;
    let irpef = 0;
    let inpsEmployeeTotal = 0;
    let inpsEmployerTotal = 0;
    let tfr = 0;
    for (const emp of next.employees) {
      const gross = emp.grossMonthly;
      const inpsEmployee = round2(gross * snap.inps_employee_rate);
      const inpsEmployer = round2(gross * snap.inps_employer_rate);
      const irpefWithheld = round2(gross * snap.irpef_withholding_simplified_rate);
      const net = round2(gross - inpsEmployee - irpefWithheld);
      totalGross += gross;
      totalNet = round2(totalNet + net);
      irpef = round2(irpef + irpefWithheld);
      inpsEmployeeTotal = round2(inpsEmployeeTotal + inpsEmployee);
      inpsEmployerTotal = round2(inpsEmployerTotal + inpsEmployer);
      tfr = round2(tfr + round2(gross * snap.tfr_accrual_factor));
    }
    const inpsTotal = round2(inpsEmployeeTotal + inpsEmployerTotal);
    next.company.cash = round2(next.company.cash - totalNet);
    next.tfrFund = round2(next.tfrFund + tfr);
    next.ytd.payrollCost = round2(
      next.ytd.payrollCost + totalGross + inpsEmployerTotal + tfr,
    );
    next.lastPayroll = {
      monthIdx: idx,
      totalGross,
      totalNet,
      irpefWithheld: irpef,
      inpsTotal,
      tfrAccrued: tfr,
    };
    pushLiability(next, "IRPEF", irpef, idx + 1);
    pushLiability(next, "INPS", inpsTotal, idx + 1);
  } else {
    next.lastPayroll = null;
  }

  // 4. IVA liquidation for invoices issued this month (competenza)
  const issuedNow = next.invoices.filter((i) => i.issuedIdx === idx);
  const output = issuedNow
    .filter((i) => i.kind === "AR")
    .reduce((sum, i) => sum + i.vat, 0);
  const input = issuedNow
    .filter((i) => i.kind === "AP")
    .reduce((sum, i) => sum + i.vat, 0);
  const netVat = round2(output - input - next.vat.credit);
  if (netVat > 0) {
    pushLiability(next, "IVA", netVat, idx + 1);
    next.vat.credit = 0;
  } else {
    next.vat.credit = -netVat;
  }

  // P&L accrual (competenza: month of issue, not of settlement)
  next.ytd.revenue = round2(
    next.ytd.revenue + issuedNow.filter((i) => i.kind === "AR").reduce((s2, i) => s2 + i.net, 0),
  );
  next.ytd.purchases = round2(
    next.ytd.purchases + issuedNow.filter((i) => i.kind === "AP").reduce((s2, i) => s2 + i.net, 0),
  );

  // 5. loan installment: constant principal share + interest on outstanding
  if (next.loan && next.loan.outstanding > 0) {
    const loan = next.loan;
    const annualRate =
      loan.rateType === "fixed"
        ? loan.fixedAnnualRate!
        : euriborAt(next.monthsPlayed) + loan.spreadBps / 10000;
    const interest = round2((loan.outstanding * annualRate) / 12);
    const principalShare = Math.min(round2(loan.principal / loan.tenorMonths), loan.outstanding);
    next.company.cash = round2(next.company.cash - interest - principalShare);
    loan.outstanding = round2(loan.outstanding - principalShare);
    loan.monthsPaid += 1;
    loan.lastInstallment = { interest, principal: principalShare };
    next.ytd.interest = round2(next.ytd.interest + interest);
  }

  // 6. annual events
  const month = next.calendar.month;

  // June close: diritto camerale (flat CCIAA fee), paid cash
  if (month === 6) {
    next.company.cash = round2(next.company.cash - snap.diritto_camerale_flat);
    next.ytd.otherCosts = round2(next.ytd.otherCosts + snap.diritto_camerale_flat);
  }

  // May/October close: acconti on prior-year tax, due June / November
  if (next.priorYearTax) {
    const split =
      month === 5 ? snap.acconto_split_first : month === 10 ? snap.acconto_split_second : 0;
    if (split > 0) {
      const accontoIres = round2(next.priorYearTax.ires * snap.ires_acconto_pct * split);
      const accontoIrap = round2(next.priorYearTax.irap * snap.ires_acconto_pct * split);
      pushLiability(next, "IRES", accontoIres, idx + 1);
      pushLiability(next, "IRAP", accontoIrap, idx + 1);
      next.accontiCharged.ires = round2(next.accontiCharged.ires + accontoIres);
      next.accontiCharged.irap = round2(next.accontiCharged.irap + accontoIrap);
    }
  }

  // December close: fiscal year end.
  // IRES: simplified taxable profit (revenue - all costs).
  // IRAP: different, simplified base — labor and interest are NOT deductible.
  if (month === 12) {
    const { revenue, purchases, payrollCost, interest, otherCosts } = next.ytd;
    const profit = round2(revenue - purchases - payrollCost - interest - otherCosts);
    const irapBase = round2(revenue - purchases);
    const ires = round2(Math.max(0, profit) * snap.ires_rate);
    const irap = round2(Math.max(0, irapBase) * snap.irap_rate);

    // saldo (net of acconti already charged) due next June
    pushLiability(next, "IRES", round2(ires - next.accontiCharged.ires), idx + 6);
    pushLiability(next, "IRAP", round2(irap - next.accontiCharged.irap), idx + 6);

    next.lastYearReport = {
      year: next.calendar.year,
      revenue,
      purchases,
      payrollCost,
      interest,
      otherCosts,
      profit,
      irapBase,
      ires,
      irap,
    };
    next.priorYearTax = { ires, irap };
    next.ytd = { revenue: 0, purchases: 0, payrollCost: 0, interest: 0, otherCosts: 0 };
    next.accontiCharged = { ires: 0, irap: 0 };
  }

  // 7. calendar
  const isDecember = next.calendar.month === 12;
  next.calendar = {
    month: isDecember ? 1 : next.calendar.month + 1,
    year: isDecember ? next.calendar.year + 1 : next.calendar.year,
  };

  // 8. win/lose check
  next.monthsPlayed += 1;
  next.monthsBelowZero = next.company.cash < 0 ? next.monthsBelowZero + 1 : 0;
  if (next.monthsBelowZero >= LOSE_MONTHS_BELOW_ZERO) {
    next.status = "lost";
  } else if (next.monthsPlayed >= WIN_MONTHS && next.company.cash >= 0) {
    next.status = "won";
  }

  return next;
};
