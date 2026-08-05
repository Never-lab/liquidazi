import { fiscalYearSnapshot as snap } from "../config/fiscalYearSnapshot";
import { SECTOR_PROFILES } from "../config/sectorProfile";
import { DIFFICULTIES } from "../config/difficulty";
import { hasUpgrade } from "../config/upgrades";
import {
  buildRescueOffer,
  euriborAt,
  FIDO_SPREAD_BPS,
  complianceSpreadPenaltyBps,
  frenchPayment,
  treasuryAnnualRate,
} from "./actions";
import { applySubsidiaryMonth, refreshAcquisitionBoard } from "./acquisitions";
import { tickContracts } from "./contracts";
import { runWorldEvents } from "./eventCatalog";
import { refreshMarketBoard, rng, monthlyCapacity } from "./events";
import { unlockMilestones } from "./milestones";
import {
  defaultFactorFromPressure,
  inspectionMalusMult,
  rentFactorFromPressure,
  rollPressure,
  shouldRollPressure,
  supplyConsumeExtra,
  tickPressure,
} from "./pressures";
import { seedRival, tickRivalHeat } from "./rival";
import {
  CAMPAIGN_WIN_MONTHS,
  LOSE_MONTHS_BELOW_ZERO,
  round2,
  toMonthIndex,
  type GameState,
  type LiabilityKind,
} from "./types";
import {
  baseGrossFor,
  grossWithSeniority,
  MAX_SENIORITY_STEPS,
  SENIORITY_MONTHS,
  STAFF_ROLES,
  type StaffRole,
} from "../config/staffPay";

const YEAR_REPORTS_MAX = 8;
const STAFF_ROLE_NAMES: ReadonlySet<string> = new Set(STAFF_ROLES.map((r) => r.role));

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
  const processiDiscount = hasUpgrade(next.upgrades, "processi") ? 0.95 : 1;

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
  const cashOut = round2(totalNet * processiDiscount);
  const ytdPiece = round2((totalGross + inpsEmployerTotal + tfr) * processiDiscount);
  next.company.cash = round2(next.company.cash - cashOut);
  next.tfrFund = round2(next.tfrFund + tfr);
  next.ytd.payrollCost = round2(next.ytd.payrollCost + ytdPiece);
  next.lastPayroll = {
    monthIdx: idx,
    totalGross,
    totalNet: cashOut,
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
  if (state.pendingEvent) return state;

  const next = structuredClone(state);
  next.upgrades ??= [];
  next.yearReports ??= next.lastYearReport ? [next.lastYearReport] : [];
  next.tempCapacityMonths ??= 0;
  next.pendingEvent ??= null;
  next.supplyMonths ??= 0;
  next.milestones ??= [];
  next.activeContracts ??= [];
  next.quarterPressure ??= null;
  if (!next.rival) next.rival = seedRival(next);
  // Defensive defaults: fields added after some saves were created should
  // never resurrect as undefined/NaN on load (see persist migration above).
  if (next.loan) {
    const loanAnnualRate =
      next.loan.rateType === "fixed"
        ? (next.loan.fixedAnnualRate ?? euriborAt(next.monthsPlayed) + next.loan.spreadBps / 10000)
        : euriborAt(next.monthsPlayed) + next.loan.spreadBps / 10000;
    next.loan.monthlyPayment ??= frenchPayment(
      next.loan.outstanding,
      loanAnnualRate,
      Math.max(1, next.loan.tenorMonths - next.loan.monthsPaid),
    );
  }
  for (const emp of next.employees) {
    emp.senioritySteps ??= 0;
  }
  if (next.fido) {
    next.fido.lastInterest ??= 0;
  }
  const cashBefore = next.company.cash;
  const lines: { label: string; amount: number }[] = [];
  const note = (label: string, before: number) => {
    const d = round2(next.company.cash - before);
    if (Math.abs(d) >= 0.01) lines.push({ label, amount: d });
  };
  const idx = toMonthIndex(next.calendar);
  const profile = SECTOR_PROFILES[next.company.sector];
  const rand = rng(idx * 7919 + next.monthsPlayed * 31);
  const supplyEmpty = (next.supplyMonths ?? 0) <= 0;
  const defaultBoost =
    (supplyEmpty ? 1.45 : 1) * defaultFactorFromPressure(next);

  // 0a. multi-month contract tranches (issued this closing month)
  {
    const ticked = tickContracts(next);
    next.invoices = ticked.invoices;
    next.activeContracts = ticked.activeContracts;
    next.nextId = ticked.nextId;
    next.log = ticked.log;
    next.vat = ticked.vat;
    next.ytd = ticked.ytd;
    next.company = ticked.company;
    next.career = ticked.career;
  }

  // 0. gestionale: versa F24 dovuti se cassa basta (prima delle sanzioni)
  if (hasUpgrade(next.upgrades, "gestionale_f24")) {
    let due = 0;
    for (const l of next.liabilities) {
      if (!l.paid && l.dueIdx <= idx) due = round2(due + l.amount);
    }
    if (due > 0 && next.company.cash >= due) {
      for (const l of next.liabilities) {
        if (!l.paid && l.dueIdx <= idx) l.paid = true;
      }
      next.company.cash = round2(next.company.cash - due);
      next.log.unshift({
        id: next.nextId++,
        monthIdx: idx,
        tone: "good",
        text: `Gestionale: F24 versato automaticamente (−${due.toLocaleString("it-IT")} €).`,
      });
      next.log = next.log.slice(0, 12);
    }
  }

  // 1. invoice settlement (+ insoluti; PA split payment → incassi il netto)
  {
    const b = next.company.cash;
    for (const inv of next.invoices) {
      if (inv.settled || inv.defaulted || inv.dueIdx > idx) continue;

      if (
        !next.quietMode &&
        inv.kind === "AR" &&
        inv.clientType !== "pa" &&
        rand() <
          profile.defaultChance *
            DIFFICULTIES[next.difficulty ?? "normal"].defaultMult *
            defaultBoost
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
    note("Incassi/pagamenti", b);
  }

  // 1b. monthly zone rent / locale
  if (next.company.monthlyRent > 0) {
    const b = next.company.cash;
    const rent = round2(next.company.monthlyRent * rentFactorFromPressure(next));
    next.company.cash = round2(next.company.cash - rent);
    next.ytd.otherCosts = round2(next.ytd.otherCosts + rent);
    note("Affitto", b);
  }

  // 1c. treasury interest + subsidiary portfolio drip
  next.treasury ??= 0;
  next.subsidiaries ??= [];
  next.acquisitionBoard ??= [];
  next.growthInvested ??= 0;
  next.growthCapacityBonus ??= 0;
  if (next.treasury > 0) {
    const b = next.company.cash;
    const interest = round2((next.treasury * treasuryAnnualRate(next.monthsPlayed)) / 12);
    if (interest > 0) {
      next.treasury = round2(next.treasury + interest);
      // interest stays in treasury — not cash; track on treasury only via log
      next.log.unshift({
        id: next.nextId++,
        monthIdx: idx,
        tone: "good",
        text: `Interessi tesoreria: +${interest.toLocaleString("it-IT")} €.`,
      });
      next.log = next.log.slice(0, 12);
    }
    void b;
  }
  {
    const b = next.company.cash;
    applySubsidiaryMonth(next, rand);
    note("Partecipate", b);
  }

  // 2. skipped F24s
  for (const l of next.liabilities) {
    if (!l.paid && !l.penalized && l.dueIdx <= idx) {
      l.penalized = true;
      l.amount = round2(l.amount * (1 + snap.penalty_late_pct + snap.interest_late_pct));
      next.compliance = Math.max(
        0,
        next.compliance - snap.compliance_malus_late * inspectionMalusMult(next),
      );
    }
  }

  // 2b. scatti anzianità (ogni SENIORITY_MONTHS mesi di servizio, cap MAX_SENIORITY_STEPS)
  for (const emp of next.employees) {
    const months = idx - emp.hireMonthIdx;
    const steps = Math.min(
      MAX_SENIORITY_STEPS,
      Math.max(0, Math.floor(months / SENIORITY_MONTHS)),
    );
    if (steps !== emp.senioritySteps) {
      emp.senioritySteps = steps;
      // Unknown/legacy roles (e.g. test fixtures) have no CCNL entry — leave
      // their gross unchanged rather than recomputing from an undefined base.
      if (STAFF_ROLE_NAMES.has(emp.role)) {
        emp.grossMonthly = grossWithSeniority(
          baseGrossFor(next.company.sector, emp.role as StaffRole),
          steps,
        );
      }
    }
  }

  // 2c. Responsabile: tiene a bada il fisco (+compliance); l'effetto sul
  // rivale (−heat) è applicato dopo tickRivalHeat, a fine mese.
  const nResp = next.employees.filter((e) => e.role === "Responsabile").length;
  if (nResp > 0) {
    next.compliance = Math.min(100, next.compliance + 2 * nResp);
  }

  // 3. payroll (+ 13ª in dicembre)
  {
    const b = next.company.cash;
    runPayroll(next, idx);
    note("Personale", b);
  }

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

  // 5. loan installment (rata francese: rimborso costante, quota capitale
  // cresce col tempo; l'ultima rata e i casi limite azzerano l'outstanding)
  if (next.loan && next.loan.outstanding > 0) {
    const b = next.company.cash;
    const loan = next.loan;
    const annualRate =
      loan.rateType === "fixed"
        ? loan.fixedAnnualRate!
        : euriborAt(next.monthsPlayed) + loan.spreadBps / 10000;
    const interest = round2((loan.outstanding * annualRate) / 12);
    let principalShare = round2(loan.monthlyPayment - interest);
    if (loan.monthsPaid + 1 >= loan.tenorMonths || principalShare > loan.outstanding) {
      principalShare = loan.outstanding;
    } else if (principalShare < 0) {
      principalShare = 0;
    }
    const payment = round2(interest + principalShare);
    next.company.cash = round2(next.company.cash - payment);
    loan.outstanding = round2(loan.outstanding - principalShare);
    loan.monthsPaid += 1;
    loan.lastInstallment = { interest, principal: principalShare };
    next.ytd.interest = round2(next.ytd.interest + interest);
    note("Mutuo", b);
  }

  // 5b. fido: interessi sullo scoperto + rimborso automatico se c'è cassa
  if (next.fido && next.fido.drawn > 0) {
    const b = next.company.cash;
    const annual =
      euriborAt(next.monthsPlayed) +
      (FIDO_SPREAD_BPS + complianceSpreadPenaltyBps(next.compliance)) / 10000;
    const interest = round2((next.fido.drawn * annual) / 12);
    next.company.cash = round2(next.company.cash - interest);
    next.ytd.interest = round2(next.ytd.interest + interest);
    next.fido.lastInterest = interest;
    if (next.company.cash > 0 && next.fido.drawn > 0) {
      const repay = round2(Math.min(next.company.cash, next.fido.drawn));
      next.company.cash = round2(next.company.cash - repay);
      next.fido.drawn = round2(next.fido.drawn - repay);
    }
    note("Fido", b);
  }
  if (next.fido && next.fido.drawn === 0) {
    next.fido.lastInterest = 0;
  }

  // 6. annual events
  const month = next.calendar.month;

  if (month === 6) {
    const b = next.company.cash;
    next.company.cash = round2(next.company.cash - snap.diritto_camerale_flat);
    next.ytd.otherCosts = round2(next.ytd.otherCosts + snap.diritto_camerale_flat);
    note("Diritto camerale", b);
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
    next.yearReports = [...(next.yearReports ?? []), next.lastYearReport].slice(
      -YEAR_REPORTS_MAX,
    );
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
      year2Reached: false,
    };
  }
  next.career.year2Reached ??= false;
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
  } else if (
    next.status === "running" &&
    next.monthsPlayed >= CAMPAIGN_WIN_MONTHS &&
    !next.career.year2Reached
  ) {
    next.career.year2Reached = true;
    next.status = "won";
  }

  const point = {
    monthIdx: closedIdx,
    label: closedLabel,
    cash: next.company.cash,
    revenue: round2(monthRevenue),
    costs: monthCosts,
  };
  const hist = [...next.history];
  const last = hist[hist.length - 1];
  // Opening seed uses the same monthIdx as the first close — replace, don't duplicate.
  if (last && last.monthIdx === closedIdx) {
    hist[hist.length - 1] = point;
  } else {
    hist.push(point);
  }
  next.history = hist.slice(-36);

  if (next.tempCapacityMonths > 0) {
    next.tempCapacityMonths -= 1;
  }

  // Consume supply if you sold this month; boom eats extra
  const salesClosed = next.invoices.filter(
    (i) => i.kind === "AR" && i.issuedIdx === closedIdx,
  ).length;
  const consume =
    (salesClosed > 0 || next.employees.length > 0 ? 1 : 0) + supplyConsumeExtra(next);
  if (consume > 0) {
    if ((next.supplyMonths ?? 0) > 0) {
      next.supplyMonths = Math.max(0, (next.supplyMonths ?? 0) - consume);
    } else if (!next.quietMode) {
      next.log.unshift({
        id: next.nextId++,
        monthIdx: closedIdx,
        tone: "bad",
        text: "Scorte a zero: ticket più bassi e più insoluti finché non ordini forniture.",
      });
      next.log = next.log.slice(0, 12);
    }
  }

  // Rival heat from how many sales you took this month
  {
    const heated = tickRivalHeat(next, salesClosed, Math.max(1, monthlyCapacity(next)));
    next.rival = heated.rival;
  }

  // Responsabile: tiene a bada il rivale (−heat), applicato dopo la deriva mensile.
  if (nResp > 0 && next.rival) {
    next.rival = { ...next.rival, heat: Math.max(0, next.rival.heat - nResp) };
  }

  next.lastCloseSummary = {
    cashBefore,
    cashAfter: next.company.cash,
    delta: round2(next.company.cash - cashBefore),
    lines,
  };

  const mil = unlockMilestones(next);
  next.milestones = mil.state.milestones;
  for (const id of mil.unlocked) {
    const label =
      id === "survive_12"
        ? "12 mesi in piedi"
        : id === "year1_profit"
          ? "Utile Y1"
          : id === "first_acquisition"
            ? "Prima acquisizione"
            : "Compliance ≥ 80";
    next.log.unshift({
      id: next.nextId++,
      monthIdx: closedIdx,
      tone: "good",
      text: `Obiettivo raggiunto: ${label}`,
    });
  }
  next.log = next.log.slice(0, 12);

  // Tick / roll quarter pressure after books close (calendar already advanced)
  {
    const afterTick = tickPressure(next);
    next.quarterPressure = afterTick.quarterPressure;
    next.log = afterTick.log;
    next.nextId = afterTick.nextId;
    if (shouldRollPressure(next)) {
      const rolled = rollPressure(next);
      next.quarterPressure = rolled.quarterPressure;
      next.log = rolled.log;
      next.nextId = rolled.nextId;
    }
  }

  if (next.status === "running") {
    let s = refreshMarketBoard(next);
    s = refreshAcquisitionBoard(s);
    if (!next.quietMode) s = runWorldEvents(s);
    return s;
  }

  return next;
};
