import { fiscalYearSnapshot as snap } from "../config/fiscalYearSnapshot";
import { SECTOR_PROFILES } from "../config/sectorProfile";
import { DIFFICULTIES } from "../config/difficulty";
import {
  buildRescueOffer,
  euriborAt,
  FIDO_SPREAD_BPS,
} from "./actions";
import { applyRandomEvent, refreshMarketBoard, rng } from "./events";
import {
  LOSE_MONTHS_BELOW_ZERO,
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

/** Cedolino: in dicembre paga anche la 13ª (2× lordo didattico). */
const runPayroll = (next: GameState, idx: number): void => {
  if (next.employees.length === 0) {
    next.lastPayroll = null;
    return;
  }

  const thirteenth = next.calendar.month === 12;
  const payMonths = thirteenth ? 2 : 1;

  let totalGross = 0;
  let totalNet = 0;
  let irpef = 0;
  let inpsEmployeeTotal = 0;
  let inpsEmployerTotal = 0;
  let tfr = 0;
  for (const emp of next.employees) {
    const gross = round2(emp.grossMonthly * payMonths);
    const inpsEmployee = round2(gross * snap.inps_employee_rate);
    const inpsEmployer = round2(gross * snap.inps_employer_rate);
    const irpefWithheld = round2(gross * snap.irpef_withholding_simplified_rate);
    const net = round2(gross - inpsEmployee - irpefWithheld);
    const tfrPiece = round2(gross * snap.tfr_accrual_factor);
    totalGross = round2(totalGross + gross);
    totalNet = round2(totalNet + net);
    irpef = round2(irpef + irpefWithheld);
    inpsEmployeeTotal = round2(inpsEmployeeTotal + inpsEmployee);
    inpsEmployerTotal = round2(inpsEmployerTotal + inpsEmployer);
    tfr = round2(tfr + tfrPiece);
    emp.tfrAccrued = round2(emp.tfrAccrued + tfrPiece);
  }
  const inpsTotal = round2(inpsEmployeeTotal + inpsEmployerTotal);
  next.company.cash = round2(next.company.cash - totalNet);
  next.tfrFund = round2(next.tfrFund + tfr);
  next.ytd.payrollCost = round2(next.ytd.payrollCost + totalGross + inpsEmployerTotal + tfr);
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

  if (thirteenth) {
    next.log.unshift({
      id: next.nextId++,
      monthIdx: idx,
      tone: "bad",
      text: "Dicembre: pagata anche la 13ª mensilità (doppio cedolino didattico).",
    });
    next.log = next.log.slice(0, 12);
  }
};

/**
 * Pure simulation step: closes the current month and moves the calendar
 * forward.
 */
export const advanceMonth = (state: GameState): GameState => {
  if (state.status !== "running") return state;

  const next = structuredClone(state);
  const idx = toMonthIndex(next.calendar);
  const profile = SECTOR_PROFILES[next.company.sector];
  const rand = rng(idx * 7919 + next.monthsPlayed * 31);

  // 1. invoice settlement (+ insoluti; PA split payment → incassi il netto)
  for (const inv of next.invoices) {
    if (inv.settled || inv.defaulted || inv.dueIdx > idx) continue;

    if (
      !next.quietMode &&
      inv.kind === "AR" &&
      inv.clientType !== "pa" &&
      rand() <
        profile.defaultChance * DIFFICULTIES[next.difficulty ?? "normal"].defaultMult
    ) {
      inv.settled = true;
      inv.defaulted = true;
      next.company.reputation = Math.max(0, round2(next.company.reputation - 5));
      next.log.unshift({
        id: next.nextId++,
        monthIdx: idx,
        tone: "bad",
        text: `Insoluto: fattura #${inv.id} (${inv.net.toLocaleString("it-IT")} € + IVA) non pagata.`,
      });
      next.log = next.log.slice(0, 12);
      continue;
    }

    inv.settled = true;
    if (inv.kind === "AR") {
      const inflow = inv.splitPayment ? inv.net : inv.gross;
      next.company.cash = round2(next.company.cash + inflow);
    } else {
      next.company.cash = round2(next.company.cash - inv.gross);
    }
  }

  // 1b. monthly zone rent / locale
  if (next.company.monthlyRent > 0) {
    next.company.cash = round2(next.company.cash - next.company.monthlyRent);
    next.ytd.otherCosts = round2(next.ytd.otherCosts + next.company.monthlyRent);
  }

  // 2. skipped F24s
  for (const l of next.liabilities) {
    if (!l.paid && !l.penalized && l.dueIdx <= idx) {
      l.penalized = true;
      l.amount = round2(l.amount * (1 + snap.penalty_late_pct + snap.interest_late_pct));
      next.compliance = Math.max(0, next.compliance - snap.compliance_malus_late);
    }
  }

  // 3. payroll (+ 13ª in dicembre)
  runPayroll(next, idx);

  // 4. IVA: split payment PA escluso dall'output (IVA versata dalla PA allo Stato)
  const issuedNow = next.invoices.filter((i) => i.issuedIdx === idx);
  const output = issuedNow
    .filter((i) => i.kind === "AR" && !i.splitPayment)
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

  next.ytd.revenue = round2(
    next.ytd.revenue + issuedNow.filter((i) => i.kind === "AR").reduce((s2, i) => s2 + i.net, 0),
  );
  next.ytd.purchases = round2(
    next.ytd.purchases + issuedNow.filter((i) => i.kind === "AP").reduce((s2, i) => s2 + i.net, 0),
  );

  // 5. loan installment
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

  // 5b. fido: interessi sullo scoperto + rimborso automatico se c'è cassa
  if (next.fido && next.fido.drawn > 0) {
    const annual = euriborAt(next.monthsPlayed) + FIDO_SPREAD_BPS / 10000;
    const interest = round2((next.fido.drawn * annual) / 12);
    next.company.cash = round2(next.company.cash - interest);
    next.ytd.interest = round2(next.ytd.interest + interest);
    if (next.company.cash > 0 && next.fido.drawn > 0) {
      const repay = round2(Math.min(next.company.cash, next.fido.drawn));
      next.company.cash = round2(next.company.cash - repay);
      next.fido.drawn = round2(next.fido.drawn - repay);
    }
  }

  // 6. annual events
  const month = next.calendar.month;

  if (month === 6) {
    next.company.cash = round2(next.company.cash - snap.diritto_camerale_flat);
    next.ytd.otherCosts = round2(next.ytd.otherCosts + snap.diritto_camerale_flat);
  }

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

  if (month === 12) {
    const { revenue, purchases, payrollCost, interest, otherCosts } = next.ytd;
    const profit = round2(revenue - purchases - payrollCost - interest - otherCosts);
    const irapBase = round2(revenue - purchases);
    const ires = round2(Math.max(0, profit) * snap.ires_rate);
    const irap = round2(Math.max(0, irapBase) * snap.irap_rate);

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

  // 7. close books snapshot, then calendar
  const monthRevenue = issuedNow.filter((i) => i.kind === "AR").reduce((s, i) => s + i.net, 0);
  const monthPurchases = issuedNow.filter((i) => i.kind === "AP").reduce((s, i) => s + i.net, 0);
  const monthCosts = round2(
    monthPurchases +
      (next.lastPayroll?.totalNet ?? 0) +
      next.company.monthlyRent +
      (next.loan?.lastInstallment
        ? next.loan.lastInstallment.interest + next.loan.lastInstallment.principal
        : 0),
  );
  const closedLabel = `${next.calendar.month}/${next.calendar.year}`;
  const closedIdx = idx;

  const isDecember = next.calendar.month === 12;
  next.calendar = {
    month: isDecember ? 1 : next.calendar.month + 1,
    year: isDecember ? next.calendar.year + 1 : next.calendar.year,
  };

  // 8. lose: 12 mesi consecutivi in rosso; in difficoltà proponi prestito
  next.monthsPlayed += 1;

  // career peaks for leaderboard
  if (!next.career) {
    next.career = {
      peakCash: next.company.cash,
      peakDebt: 0,
      lifetimeRevenue: 0,
      submitted: false,
    };
  }
  const debtNow = round2(
    (next.loan?.outstanding ?? 0) +
      (next.fido?.drawn ?? 0) +
      Math.max(0, -next.company.cash),
  );
  next.career.peakCash = Math.max(next.career.peakCash, next.company.cash);
  next.career.peakDebt = Math.max(next.career.peakDebt, debtNow);
  next.career.lifetimeRevenue = round2(next.career.lifetimeRevenue + monthRevenue);

  if (next.company.cash < 0) {
    next.monthsBelowZero += 1;
    if (!next.loanOffer) {
      const offer = buildRescueOffer(next);
      if (offer) {
        next.loanOffer = offer;
        next.log.unshift({
          id: next.nextId++,
          monthIdx: closedIdx,
          tone: "bad",
          text: `Cassa in rosso (${next.monthsBelowZero}/${LOSE_MONTHS_BELOW_ZERO}). La banca propone ${offer.principal.toLocaleString("it-IT")} € a 24 mesi.`,
        });
        next.log = next.log.slice(0, 12);
      }
    }
  } else {
    next.monthsBelowZero = 0;
    next.loanOffer = null;
  }

  if (next.monthsBelowZero >= LOSE_MONTHS_BELOW_ZERO) {
    next.status = "lost";
    next.loanOffer = null;
  }

  next.history = [
    ...next.history,
    {
      monthIdx: closedIdx,
      label: closedLabel,
      cash: next.company.cash,
      revenue: round2(monthRevenue),
      costs: monthCosts,
    },
  ].slice(-36);

  if (next.status === "running") {
    const afterEvents = next.quietMode ? next : applyRandomEvent(next);
    return refreshMarketBoard(afterEvents);
  }

  return next;
};
