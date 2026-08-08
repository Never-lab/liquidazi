import { fiscalYearSnapshot as snap } from "../config/fiscalYearSnapshot";
import {
  STAFF_ROLES,
  baseGrossFor,
  type StaffRole,
} from "../config/staffPay";
import {
  UPGRADES,
  UPGRADE_LEVELS,
  upgradeLevel,
  type UpgradeId,
  type UpgradeLevel,
} from "../config/upgrades";
import { f24BlockedByCollection } from "./collection";
import { migrateUpgradeState } from "./migrateUpgrades";
import { marketModifiersFromIndex } from "./market";
import { hasPressure } from "./pressures";
import {
  round2,
  toMonthIndex,
  type ClientType,
  type GameState,
  type InvoiceKind,
  type LoanGuarantee,
  type LoanOffer,
} from "./types";

export interface InvoiceOpts {
  clientType?: ClientType;
  /** months until settlement; default 1 */
  termMonths?: number;
}

const addInvoice = (
  state: GameState,
  kind: InvoiceKind,
  net: number,
  opts?: InvoiceOpts,
): GameState => {
  const next = structuredClone(state);
  const idx = toMonthIndex(next.calendar);
  const mods = marketModifiersFromIndex(next.company.densityIndex);
  const scaledNet = round2(net * (kind === "AR" ? mods.priceFactor : mods.costFactor));
  const vat = round2(scaledNet * snap.iva_standard_rate);
  const term = Math.max(1, Math.min(12, opts?.termMonths ?? 1));
  next.invoices.push({
    id: next.nextId++,
    kind,
    net: scaledNet,
    vat,
    gross: round2(scaledNet + vat),
    issuedIdx: idx,
    dueIdx: idx + term,
    settled: false,
    ...(kind === "AR"
      ? {
          clientType: opts?.clientType ?? "private",
          splitPayment: (opts?.clientType ?? "private") === "pa",
          defaulted: false,
        }
      : {}),
  });
  return next;
};

/** Emetti fattura cliente (AR): solo via opportunità; netto già entro tetto. */
export const issueCustomerInvoice = (
  state: GameState,
  net: number,
  opts?: InvoiceOpts,
): GameState => {
  if (!(net > 0) || net > 35000) return state;
  return addInvoice(state, "AR", net, opts);
};

/** Registra costo fornitore (AP). */
export const recordSupplierCost = (
  state: GameState,
  net: number,
  termMonths = 1,
): GameState => {
  if (!(net > 0) || net > 35000) return state;
  return addInvoice(state, "AP", net, { termMonths });
};

export { STAFF_ROLES };

export const hireEmployee = (state: GameState, role: string): GameState => {
  if (hasPressure(state, "hiring_freeze")) {
    const blocked = structuredClone(state);
    blocked.log.unshift({
      id: blocked.nextId++,
      monthIdx: toMonthIndex(blocked.calendar),
      tone: "bad",
      text: "Blocco assunzioni: pressione trimestre attiva.",
    });
    blocked.log = blocked.log.slice(0, 12);
    return blocked;
  }
  const def = STAFF_ROLES.find((r) => r.role === role);
  if (!def) return state;
  const staffRole = def.role as StaffRole;
  const next = structuredClone(state);
  next.employees.push({
    id: next.nextId++,
    role: staffRole,
    grossMonthly: baseGrossFor(next.company.sector, staffRole),
    hireMonthIdx: toMonthIndex(next.calendar),
    tfrAccrued: 0,
    senioritySteps: 0,
  });
  return next;
};

/**
 * Licenziamento: paga il TFR maturato sul dipendente (cassa − fondo).
 * Didattico — non riproduce liquidazione CCNL completa.
 */
export const fireEmployee = (state: GameState, id: number): GameState => {
  const next = structuredClone(state);
  const emp = next.employees.find((e) => e.id === id);
  if (!emp) return state;
  const payout = round2(emp.tfrAccrued);
  next.company.cash = round2(next.company.cash - payout);
  next.tfrFund = round2(Math.max(0, next.tfrFund - payout));
  next.employees = next.employees.filter((e) => e.id !== id);
  if (payout > 0) {
    next.log.unshift({
      id: next.nextId++,
      monthIdx: toMonthIndex(next.calendar),
      tone: "bad",
      text: `Licenziato ${emp.role}: liquidato TFR ${payout.toLocaleString("it-IT")} €.`,
    });
    next.log = next.log.slice(0, 12);
  }
  return next;
};

/** Spread (bps) applicato dalla banca in base alla garanzia scelta. */
export const spreadForGuarantee = (guarantee: LoanGuarantee): number => {
  if (guarantee === "fondo_garanzia_pmi")
    return snap.loan_base_spread_bps - snap.fondo_garanzia_spread_discount_bps;
  if (guarantee === "fideiussione")
    return snap.loan_base_spread_bps - snap.fideiussione_spread_discount_bps;
  return snap.loan_base_spread_bps;
};

/** Euribor 3M dello scenario al mese di gioco dato (clampato a fine path). */
export const euriborAt = (monthsPlayed: number): number => {
  const path = snap.euribor_3m_path;
  return path[Math.min(monthsPlayed, path.length - 1)];
};

/** Tasso annuale → tasso mensile (semplice, non composto). */
export const monthlyRateFromAnnual = (annual: number): number => annual / 12;

/** Rata costante di ammortamento francese; rata lineare se tasso ≤ 0. */
export const frenchPayment = (
  principal: number,
  annualRate: number,
  tenorMonths: number,
): number => {
  if (tenorMonths <= 0) return 0;
  const r = monthlyRateFromAnnual(annualRate);
  if (r <= 0) return round2(principal / tenorMonths);
  const pow = (1 + r) ** tenorMonths;
  return round2((principal * r * pow) / (pow - 1));
};

export type ScheduleRow = {
  monthIndex: number; // 1-based installment number
  interest: number;
  principal: number;
  payment: number;
  residual: number;
};

/** Piano di ammortamento francese da un capitale residuo, a tasso costante. */
export const remainingSchedule = (
  outstanding: number,
  annualRate: number,
  monthsLeft: number,
): ScheduleRow[] => {
  const rows: ScheduleRow[] = [];
  if (monthsLeft <= 0 || outstanding <= 0) return rows;
  const payment = frenchPayment(outstanding, annualRate, monthsLeft);
  const r = monthlyRateFromAnnual(annualRate);
  let residual = outstanding;
  for (let i = 1; i <= monthsLeft; i++) {
    const interest = round2(residual * r);
    let principal = round2(payment - interest);
    if (i === monthsLeft || principal > residual) {
      principal = residual;
    } else if (principal < 0) {
      principal = 0;
    }
    residual = round2(residual - principal);
    rows.push({ monthIndex: i, interest, principal, payment: round2(interest + principal), residual });
  }
  return rows;
};

/** Piano di ammortamento francese completo, simulato dal capitale erogato. */
export const buildLoanSchedule = (
  principal: number,
  annualRate: number,
  tenorMonths: number,
): ScheduleRow[] => remainingSchedule(principal, annualRate, tenorMonths);

/**
 * Offerta di salvataggio: copre il buco + cuscinetto, Fondo PMI se serve.
 */
export const buildRescueOffer = (state: GameState): LoanOffer | null => {
  if (state.company.cash >= 0) return null;
  if (state.loan && state.loan.outstanding > 0) return null;
  const hole = -state.company.cash;
  let principal = Math.max(5000, Math.ceil((hole + 4000) / 1000) * 1000);
  let guarantee: LoanGuarantee = "none";
  if (principal > snap.loan_max_principal_base) {
    guarantee = "fondo_garanzia_pmi";
    principal = Math.min(principal, snap.loan_max_principal_fondo);
  } else {
    principal = Math.min(principal, snap.loan_max_principal_base);
  }
  if (!canRequestLoan(state, principal, guarantee)) return null;
  return {
    principal,
    tenorMonths: 24,
    rateType: "fixed",
    guarantee,
  };
};

/**
 * La banca approva? Il Fondo di Garanzia PMI alza il tetto di credito e
 * abbassa lo spread — è una garanzia pubblica, NON un contributo a fondo
 * perduto. Un solo mutuo a piano ammortamento; il fido è separato.
 */
export const canRequestLoan = (
  state: GameState,
  principal: number,
  guarantee: LoanGuarantee,
): boolean => loanRefusalReason(state, principal, guarantee) === null;

export interface LoanRequest {
  principal: number;
  tenorMonths: number;
  rateType: "fixed" | "floating";
  guarantee: LoanGuarantee;
}

/** Perché la banca rifiuterebbe questo mutuo, o null se approvabile. */
export const loanRefusalReason = (
  state: GameState,
  principal: number,
  guarantee: LoanGuarantee,
): string | null => {
  if (state.loan && state.loan.outstanding > 0) return "Hai già un mutuo attivo";
  if (principal <= 0) return "Inserisci un importo positivo";
  const max =
    guarantee === "fondo_garanzia_pmi"
      ? snap.loan_max_principal_fondo
      : snap.loan_max_principal_base;
  if (principal > max) return "Importo oltre il tetto: serve una garanzia / Fondo PMI";
  return null;
};

export type LoanOfferCard = LoanRequest & {
  id: string;
  label: string;
  annualRate: number;
  monthlyPayment: number;
  disabledReason: string | null;
};

const LOAN_OFFER_TEMPLATES: ReadonlyArray<{
  id: string;
  label: string;
  principal: number;
  tenorMonths: number;
  guarantee: LoanGuarantee;
}> = [
  { id: "small", label: "Piccolo", principal: 10000, tenorMonths: 12, guarantee: "none" },
  { id: "medium", label: "Medio", principal: 25000, tenorMonths: 24, guarantee: "none" },
  {
    id: "fondo",
    label: "Fondo PMI",
    principal: 40000,
    tenorMonths: 36,
    guarantee: "fondo_garanzia_pmi",
  },
];

/** Le 3 offerte precalcolate mostrate in Credito, con rata e motivo di rifiuto. */
export const buildLoanOffers = (state: GameState): LoanOfferCard[] =>
  LOAN_OFFER_TEMPLATES.map((tpl) => {
    // Il template "medio" prova prima senza garanzia; se il tetto lo blocca,
    // ripiega su fideiussione (stesso tetto oggi, ma a prova di futuri snapshot).
    const guarantee =
      tpl.guarantee === "none" &&
      loanRefusalReason(state, tpl.principal, "none") !== null &&
      loanRefusalReason(state, tpl.principal, "fideiussione") === null
        ? "fideiussione"
        : tpl.guarantee;
    const spreadBps =
      spreadForGuarantee(guarantee) + complianceSpreadPenaltyBps(state.compliance);
    const annualRate = euriborAt(state.monthsPlayed) + spreadBps / 10000;
    const monthlyPayment = frenchPayment(tpl.principal, annualRate, tpl.tenorMonths);
    return {
      id: tpl.id,
      label: tpl.label,
      principal: tpl.principal,
      tenorMonths: tpl.tenorMonths,
      rateType: "fixed",
      guarantee,
      annualRate,
      monthlyPayment,
      disabledReason: loanRefusalReason(state, tpl.principal, guarantee),
    };
  });

export const requestLoan = (state: GameState, req: LoanRequest): GameState => {
  if (!canRequestLoan(state, req.principal, req.guarantee)) return state;
  const next = structuredClone(state);
  const wasDistressed = next.company.cash < 0 || next.loanOffer !== null;
  const spreadBps =
    spreadForGuarantee(req.guarantee) + complianceSpreadPenaltyBps(next.compliance);
  // rata francese fissa alla firma: per il variabile usiamo il tasso corrente
  // come stima attesa; il rimborso capitale si adatta mese per mese al tasso reale.
  const originationAnnualRate = euriborAt(next.monthsPlayed) + spreadBps / 10000;
  next.loan = {
    principal: req.principal,
    outstanding: req.principal,
    tenorMonths: req.tenorMonths,
    monthsPaid: 0,
    rateType: req.rateType,
    fixedAnnualRate: req.rateType === "fixed" ? originationAnnualRate : null,
    spreadBps,
    guarantee: req.guarantee,
    monthlyPayment: frenchPayment(req.principal, originationAnnualRate, req.tenorMonths),
    lastInstallment: null,
  };
  next.company.cash = round2(next.company.cash + req.principal);
  next.loanOffer = null;
  if (wasDistressed) next.distressLoanTaken = true;
  if (complianceSpreadPenaltyBps(next.compliance) > 0) {
    next.log.unshift({
      id: next.nextId++,
      monthIdx: toMonthIndex(next.calendar),
      tone: "bad",
      text: `Compliance bassa (${Math.round(next.compliance)}): la banca applica +${complianceSpreadPenaltyBps(next.compliance)} bps di spread.`,
    });
    next.log = next.log.slice(0, 12);
  }
  return next;
};

/** Accetta l'offerta di salvataggio proposta in difficoltà. */
export const acceptLoanOffer = (state: GameState): GameState => {
  if (!state.loanOffer) return state;
  return requestLoan(state, state.loanOffer);
};

export const declineLoanOffer = (state: GameState): GameState => {
  if (!state.loanOffer) return state;
  const next = structuredClone(state);
  next.loanOffer = null;
  next.log.unshift({
    id: next.nextId++,
    monthIdx: toMonthIndex(next.calendar),
    tone: "bad",
    text: "Hai rifiutato il prestito di salvataggio. Un anno in rosso e sei KO.",
  });
  next.log = next.log.slice(0, 12);
  return next;
};

const FIDO_MAX = 15000;
const FIDO_SPREAD_BPS = 450;

/** Extra spread (bps) when tax compliance is weak — banks price the risk. */
export const complianceSpreadPenaltyBps = (compliance: number): number => {
  if (compliance < 40) return 200;
  if (compliance < 70) return 100;
  return 0;
};

/** Fido ceiling shrinks with poor compliance. */
export const fidoMaxFor = (state: GameState): number => {
  if (state.compliance < 40) return Math.round(FIDO_MAX * 0.5);
  if (state.compliance < 70) return Math.round(FIDO_MAX * 0.75);
  return FIDO_MAX;
};

/** Attiva un fido di cassa (può coesistere col mutuo). */
export const requestFido = (state: GameState, limit: number): GameState => {
  const max = fidoMaxFor(state);
  if (state.fido || !(limit > 0) || limit > max) return state;
  const next = structuredClone(state);
  next.fido = { limit: round2(limit), drawn: 0 };
  next.log.unshift({
    id: next.nextId++,
    monthIdx: toMonthIndex(next.calendar),
    tone: "neutral",
    text: `Fido di cassa accordato: ${limit.toLocaleString("it-IT")} € (scoperto revolving).`,
  });
  next.log = next.log.slice(0, 12);
  return next;
};

/** Usa il fido: cash +X, drawn +X (fino al residuo). */
export const drawFido = (state: GameState, amount: number): GameState => {
  if (!state.fido || !(amount > 0)) return state;
  const room = round2(state.fido.limit - state.fido.drawn);
  const take = round2(Math.min(amount, room));
  if (take <= 0) return state;
  const next = structuredClone(state);
  next.fido!.drawn = round2(next.fido!.drawn + take);
  next.company.cash = round2(next.company.cash + take);
  return next;
};

export { FIDO_MAX, FIDO_SPREAD_BPS };

/** Paga in batch tutte le liability F24 dovute (IVA + IRPEF + INPS + IRES/IRAP). */
export const payF24 = (state: GameState): GameState => {
  if (f24BlockedByCollection(state)) return state;
  const next = structuredClone(state);
  const idx = toMonthIndex(next.calendar);
  const snap =
    next.collectionCase?.stage === "rateazione" && next.collectionCase.liabilityIds?.length
      ? new Set(next.collectionCase.liabilityIds)
      : null;
  let total = 0;
  for (const l of next.liabilities) {
    if (!l.paid && l.dueIdx <= idx) {
      if (snap?.has(l.id)) continue;
      l.paid = true;
      total = round2(total + l.amount);
    }
  }
  next.company.cash = round2(next.company.cash - total);
  return next;
};

/** Pre-Lv1 sede already applied 0.85 to monthlyRent; reconstruct base for legacy saves. */
const sedeRentBase = (
  company: GameState["company"],
  sedeLevel: UpgradeLevel,
): number => {
  if (company.monthlyRentBase != null) return company.monthlyRentBase;
  if (sedeLevel >= 1) {
    return round2(company.monthlyRent / 0.85);
  }
  return company.monthlyRent;
};

export const upgradeCost = (state: GameState, id: UpgradeId): number => {
  const def = UPGRADES[id];
  const levels = migrateUpgradeState(state);
  const current = upgradeLevel(levels, id);
  const levelIdx = current >= 3 ? 2 : current;
  const costMult = UPGRADE_LEVELS[id][levelIdx]!.costMult;
  if (id === "sede") {
    const rentBase = sedeRentBase(state.company, current);
    return Math.round(Math.max(def.cost, Math.round(rentBase * 6)) * costMult);
  }
  return Math.round(def.cost * costMult);
};

/** Level-up company upgrade (Lv1→Lv3). */
export const buyUpgrade = (state: GameState, id: UpgradeId): GameState => {
  const next = structuredClone(state);
  next.upgradeLevels = migrateUpgradeState(next);

  if (!UPGRADES[id]) return next;
  const current = upgradeLevel(next.upgradeLevels, id);
  if (current >= 3) return next;
  const cost = upgradeCost(next, id);
  if (next.company.cash < cost) return next;

  const newLevel = (current + 1) as UpgradeLevel;
  next.upgradeLevels[id] = newLevel;
  next.company.cash = round2(next.company.cash - cost);
  if (id === "sede") {
    next.company.monthlyRentBase = sedeRentBase(next.company, current);
    const factor = [1, 0.85, 0.78, 0.72][newLevel]!;
    next.company.monthlyRent = round2(next.company.monthlyRentBase * factor);
  }
  next.log.unshift({
    id: next.nextId++,
    monthIdx: toMonthIndex(next.calendar),
    tone: "good",
    text: `Upgrade: ${UPGRADES[id].label} Lv${newLevel} (−${cost.toLocaleString("it-IT")} €).`,
  });
  next.log = next.log.slice(0, 12);
  return next;
};

export const TREASURY_MIN = 500;
export const GROWTH_PER_SLOT = 4000;
export const GROWTH_CAPACITY_CAP = 3;
export { HOLDING_SLOT_BASE as MAX_SUBSIDIARIES } from "../config/holding";

export const depositTreasury = (state: GameState, amount: number): GameState => {
  const amt = round2(amount);
  if (!(amt >= TREASURY_MIN) || state.company.cash < amt) return state;
  const next = structuredClone(state);
  next.treasury = round2((next.treasury ?? 0) + amt);
  next.company.cash = round2(next.company.cash - amt);
  next.log.unshift({
    id: next.nextId++,
    monthIdx: toMonthIndex(next.calendar),
    tone: "neutral",
    text: `Tesoreria: depositati ${amt.toLocaleString("it-IT")} €.`,
  });
  next.log = next.log.slice(0, 12);
  return next;
};

export const withdrawTreasury = (state: GameState, amount: number): GameState => {
  const amt = round2(amount);
  const bal = state.treasury ?? 0;
  if (!(amt > 0) || amt > bal) return state;
  const next = structuredClone(state);
  next.treasury = round2(bal - amt);
  next.company.cash = round2(next.company.cash + amt);
  next.log.unshift({
    id: next.nextId++,
    monthIdx: toMonthIndex(next.calendar),
    tone: "neutral",
    text: `Tesoreria: prelevati ${amt.toLocaleString("it-IT")} €.`,
  });
  next.log = next.log.slice(0, 12);
  return next;
};

/** Reinvest cash into growth: every GROWTH_PER_SLOT € → +1 capacity (cap GROWTH_CAPACITY_CAP). */
export const investGrowth = (state: GameState, amount: number): GameState => {
  const amt = round2(amount);
  if (!(amt >= GROWTH_PER_SLOT) || state.company.cash < amt) return state;
  if ((state.growthCapacityBonus ?? 0) >= GROWTH_CAPACITY_CAP) return state;
  const next = structuredClone(state);
  next.growthInvested = round2((next.growthInvested ?? 0) + amt);
  next.company.cash = round2(next.company.cash - amt);
  const slots = Math.min(
    GROWTH_CAPACITY_CAP,
    Math.floor(next.growthInvested / GROWTH_PER_SLOT),
  );
  const gained = slots - (next.growthCapacityBonus ?? 0);
  next.growthCapacityBonus = slots;
  next.log.unshift({
    id: next.nextId++,
    monthIdx: toMonthIndex(next.calendar),
    tone: "good",
    text:
      gained > 0
        ? `Reinvestimento crescita −${amt.toLocaleString("it-IT")} €: +${gained} slot capacità.`
        : `Reinvestimento crescita −${amt.toLocaleString("it-IT")} € (verso il prossimo slot).`,
  });
  next.log = next.log.slice(0, 12);
  return next;
};

/** Indicative annual treasury yield (fraction of Euribor). */
export const treasuryAnnualRate = (monthsPlayed: number): number =>
  Math.max(0, euriborAt(monthsPlayed) * 0.4);
