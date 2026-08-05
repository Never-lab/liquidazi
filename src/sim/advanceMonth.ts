import { fiscalYearSnapshot as snap } from "../config/fiscalYearSnapshot";
import { round2, toMonthIndex, type GameState } from "./types";

/**
 * Pure simulation step: closes the current month and moves the calendar
 * forward. Order of operations:
 *   1. settle invoices due (cash in/out of the gross amount)
 *   2. penalize skipped F24s (one-shot penalty + interest + compliance malus)
 *   3. payroll: pay net salaries, accrue IRPEF/INPS liabilities + TFR
 *   4. liquidate month IVA (output - input - credit) → liability due next
 *      month; cash untouched until the F24 is paid
 *   5. advance calendar
 */
export const advanceMonth = (state: GameState): GameState => {
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
    let inps = 0;
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
      inps = round2(inps + inpsEmployee + inpsEmployer);
      tfr = round2(tfr + round2(gross * snap.tfr_accrual_factor));
    }
    next.company.cash = round2(next.company.cash - totalNet);
    next.tfrFund = round2(next.tfrFund + tfr);
    next.lastPayroll = {
      monthIdx: idx,
      totalGross,
      totalNet,
      irpefWithheld: irpef,
      inpsTotal: inps,
      tfrAccrued: tfr,
    };
    next.liabilities.push(
      { id: next.nextId++, kind: "IRPEF", amount: irpef, dueIdx: idx + 1, paid: false, penalized: false },
      { id: next.nextId++, kind: "INPS", amount: inps, dueIdx: idx + 1, paid: false, penalized: false },
    );
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
    next.liabilities.push({
      id: next.nextId++,
      kind: "IVA",
      amount: netVat,
      dueIdx: idx + 1,
      paid: false,
      penalized: false,
    });
    next.vat.credit = 0;
  } else {
    next.vat.credit = -netVat;
  }

  // 5. calendar
  const isDecember = next.calendar.month === 12;
  next.calendar = {
    month: isDecember ? 1 : next.calendar.month + 1,
    year: isDecember ? next.calendar.year + 1 : next.calendar.year,
  };

  return next;
};
