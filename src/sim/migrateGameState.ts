import { euriborAt, frenchPayment } from "./actions";
import { migrateLoansInPlace } from "./loans";
import { migratePortfolioLegacy } from "./migratePortfolio";
import { migrateUpgradeState } from "./migrateUpgrades";
import { migrateSupplyStock } from "./supplies";
import { seedRival } from "./rival";
import type { GameState } from "./types";

/**
 * Fill defaults for fields added after older saves were created.
 * Call on load (slots/cloud) and at the start of advanceMonth.
 */
export const migrateGameState = (state: GameState): GameState => {
  const next = state;
  next.upgradeLevels = migrateUpgradeState(next);
  next.upgrades ??= [];
  next.yearReports ??= next.lastYearReport ? [next.lastYearReport] : [];
  next.tempCapacityMonths ??= 0;
  next.pendingEvent ??= null;
  next.lastShockAt ??= null;
  next.chainBoosts ??= [];
  next.lastEventPopup ??= null;
  next.localPaysTowardMunicipal ??= 0;
  next.company.repMunicipal ??= 0;
  next.company.repNational ??= 0;
  next.collectionCase ??= null;
  next.monthsTaxOverdue ??= 0;
  next.logReadThruId ??= 0;
  next.demandRegime ??= "normale";
  next.lastUiHint ??= null;
  next.activeProject ??= null;
  next.projectOffer ??= null;
  next.projectOfferYear ??= null;
  next.staffMorale ??= 70;
  next.supplyMonths ??= 0;
  next.milestones ??= [];
  next.activeContracts ??= [];
  next.quarterPressure ??= null;
  next.treasury ??= 0;
  next.subsidiaries ??= [];
  next.acquisitionBoard ??= [];
  next.growthInvested ??= 0;
  next.growthCapacityBonus ??= 0;
  if (!next.rival) next.rival = seedRival(next);
  migrateLoansInPlace(next);
  for (const loan of next.loans) {
    const loanAnnualRate =
      loan.rateType === "fixed"
        ? (loan.fixedAnnualRate ?? euriborAt(next.monthsPlayed) + loan.spreadBps / 10000)
        : euriborAt(next.monthsPlayed) + loan.spreadBps / 10000;
    loan.monthlyPayment ??= frenchPayment(
      loan.outstanding,
      loanAnnualRate,
      Math.max(1, loan.tenorMonths - loan.monthsPaid),
    );
  }
  for (const emp of next.employees) {
    emp.senioritySteps ??= 0;
    emp.gender ??= emp.id % 2 === 0 ? "F" : "M";
    emp.sickMonthsYtd ??= 0;
  }
  for (const c of next.activeContracts ?? []) {
    if (c.workforceLock == null) {
      c.workforceLock = (c.slotCost ?? 1) * 15;
    }
  }
  next.workforceMalattiaMonthIdx ??= null;
  if (next.fido) {
    next.fido.lastInterest ??= 0;
  }
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
  migrateSupplyStock(next);
  next.portfolio ??= [];
  next.portfolioOpsUsedThisMonth ??= 0;
  next.portfolioHistory ??= [];
  return migratePortfolioLegacy(next);
};
