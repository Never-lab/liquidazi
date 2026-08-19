import {
  EXCELLENT_ABUSE_THRESHOLD,
  EXCELLENT_ABUSE_WINDOW_MONTHS,
  HIGH_QUALITY_DEMAND_MIN,
  HIGH_QUALITY_EXPECTATION_MONTHS,
  REP_PENALTY_UNSATISFIED_HIGH_QUALITY,
  tierForQuality,
  tierForPrice,
  type SupplyTier,
} from "../config/supplies";
import { round2, toMonthIndex, type GameState, type PendingSupply } from "./types";

export const supplyMonthsFromNet = (net: number): number => (net >= 1200 ? 2 : 1);

export const warehouseMonths = (state: GameState): number =>
  (state.supplyStock ?? []).reduce((s, b) => s + b.months, 0);

export const pendingMonths = (state: GameState): number =>
  (state.pendingSupply ?? []).reduce((s, p) => s + p.months, 0);

/** Stock physically in magazzino (not in transit). */
export const hasWarehouseStock = (state: GameState): boolean => warehouseMonths(state) > 0;

/** Cap check: warehouse + in arrivo. */
export const totalReservedMonths = (state: GameState): number =>
  warehouseMonths(state) + pendingMonths(state);

/** Keep legacy field in sync for HUD/tests. */
export const syncSupplyMonths = (state: GameState): void => {
  state.supplyMonths = totalReservedMonths(state);
};

export const migrateSupplyStock = (state: GameState): void => {
  state.excellentSupplyLog ??= [];
  state.highQualityExpectationMonths ??= 0;
  state.supplyStock ??= [];
  state.pendingSupply ??= [];
  if (
    state.supplyStock.length === 0 &&
    (state.pendingSupply?.length ?? 0) === 0 &&
    (state.supplyMonths ?? 0) > 0
  ) {
    state.supplyStock.push({ quality: 65, months: state.supplyMonths ?? 0 });
  }
  syncSupplyMonths(state);
};

export const rollSupplyQuality = (net: number, rand: () => number): number => {
  const tier = tierForPrice(net);
  const span = tier.qualityMax - tier.qualityMin;
  return Math.round(tier.qualityMin + rand() * span);
};

export const rollSupplyNet = (tier: SupplyTier, rand: () => number): number => {
  const span = tier.priceMax - tier.priceMin;
  return round2(tier.priceMin + rand() * span);
};

export const pickSupplyTier = (rand: () => number): SupplyTier => {
  const r = rand();
  if (r < 0.38) return tierForQuality(40);
  if (r < 0.68) return tierForQuality(65);
  if (r < 0.88) return tierForQuality(80);
  return tierForQuality(92);
};

export const canAddSupplyMonths = (
  state: GameState,
  add: number,
  cap: number,
): boolean => totalReservedMonths(state) + add <= cap;

export const queuePendingSupply = (
  state: GameState,
  quality: number,
  months: number,
): void => {
  migrateSupplyStock(state);
  const arrivesAt = toMonthIndex(state.calendar) + 1;
  state.pendingSupply!.push({ quality, months, arrivesAtMonthIdx: arrivesAt });
  syncSupplyMonths(state);
};

/** Deliver pending lots whose arrival month has been reached. */
export const deliverPendingSupply = (state: GameState, monthIdx: number): void => {
  migrateSupplyStock(state);
  const kept: PendingSupply[] = [];
  for (const p of state.pendingSupply!) {
    if (p.arrivesAtMonthIdx <= monthIdx) {
      state.supplyStock!.push({ quality: p.quality, months: p.months });
    } else {
      kept.push(p);
    }
  }
  state.pendingSupply = kept;
  syncSupplyMonths(state);
};

export const bestWarehouseQuality = (state: GameState): number | null => {
  const stock = state.supplyStock ?? [];
  if (stock.length === 0) return null;
  return stock[0]!.quality;
};

export const meetsQualityDemand = (state: GameState, required: number): boolean => {
  const q = bestWarehouseQuality(state);
  return q != null && q >= required;
};

export const revenueMultFromStock = (state: GameState): number => {
  const q = bestWarehouseQuality(state);
  if (q == null) return 1;
  return tierForQuality(q).revenueMult;
};

export interface SaleSupplyResult {
  net: number;
  note?: string;
  defectCost?: number;
}

/** Apply FIFO stock quality to sale net; does not mutate stock (call consume after invoice). */
export const applySupplyToSaleNet = (state: GameState, baseNet: number): SaleSupplyResult => {
  migrateSupplyStock(state);
  const batch = state.supplyStock![0];
  if (!batch || batch.months <= 0) return { net: baseNet };
  const tier = tierForQuality(batch.quality);
  const net = round2(baseNet * tier.revenueMult);
  let note = `${tier.label}: introito ${tier.revenueMult >= 1 ? "+" : ""}${Math.round((tier.revenueMult - 1) * 100)}%`;
  let defectCost: number | undefined;
  if (tier.defectChance != null && tier.defectChance > 0) {
    const seed = toMonthIndex(state.calendar) * 17 + state.nextId + Math.round(baseNet);
    const r = (Math.sin(seed) * 10000) % 1;
    const hit = r < 0 ? r + 1 : r;
    if (hit < tier.defectChance) {
      defectCost = round2(Math.max(180, baseNet * 0.04));
      note += ` · difetto −${defectCost.toLocaleString("it-IT")} €`;
    }
  }
  return { net, note, defectCost };
};

export const consumeSupplyAfterSale = (state: GameState, qualityUsed: number | null): void => {
  if (qualityUsed == null) return;
  const tier = tierForQuality(qualityUsed);
  if (tier.singleUseBatch && state.supplyStock![0]?.quality === qualityUsed) {
    state.supplyStock!.shift();
  }
  if (qualityUsed >= 86) {
    recordExcellentUse(state, toMonthIndex(state.calendar));
  }
  syncSupplyMonths(state);
};

export const consumeSupplyMonthly = (state: GameState, units: number): void => {
  migrateSupplyStock(state);
  let left = units;
  while (left > 0 && state.supplyStock!.length > 0) {
    const batch = state.supplyStock![0]!;
    const take = Math.min(left, batch.months);
    batch.months -= take;
    left -= take;
    if (batch.months <= 0) state.supplyStock!.shift();
  }
  syncSupplyMonths(state);
};

export const loseSupplyMonths = (state: GameState, lost: number, wipe?: boolean): void => {
  migrateSupplyStock(state);
  if (wipe) {
    state.supplyStock = [];
    state.pendingSupply = [];
  } else {
    consumeSupplyMonthly(state, lost);
    let pendingLeft = lost;
    while (pendingLeft > 0 && (state.pendingSupply?.length ?? 0) > 0) {
      const p = state.pendingSupply![0]!;
      const take = Math.min(pendingLeft, p.months);
      p.months -= take;
      pendingLeft -= take;
      if (p.months <= 0) state.pendingSupply!.shift();
    }
  }
  syncSupplyMonths(state);
};

export const recordExcellentUse = (state: GameState, monthIdx: number): void => {
  migrateSupplyStock(state);
  const q = bestWarehouseQuality(state);
  if (q == null || q < 86) return;
  const log = state.excellentSupplyLog!.filter(
    (m) => monthIdx - m <= EXCELLENT_ABUSE_WINDOW_MONTHS,
  );
  log.push(monthIdx);
  state.excellentSupplyLog = log;
  if (log.length >= EXCELLENT_ABUSE_THRESHOLD) {
    state.highQualityExpectationMonths = Math.max(
      state.highQualityExpectationMonths ?? 0,
      HIGH_QUALITY_EXPECTATION_MONTHS,
    );
  }
};

export const tickHighQualityExpectations = (state: GameState): void => {
  if ((state.highQualityExpectationMonths ?? 0) > 0) {
    state.highQualityExpectationMonths! -= 1;
  }
  const idx = toMonthIndex(state.calendar);
  state.excellentSupplyLog = (state.excellentSupplyLog ?? []).filter(
    (m) => idx - m <= EXCELLENT_ABUSE_WINDOW_MONTHS,
  );
};

export const applyHighQualityRepPenalty = (state: GameState): void => {
  const penalty = REP_PENALTY_UNSATISFIED_HIGH_QUALITY;
  state.company.reputation = Math.max(0, state.company.reputation - penalty);
  state.company.repMunicipal = Math.max(0, (state.company.repMunicipal ?? 0) - penalty);
  state.company.repNational = Math.max(0, (state.company.repNational ?? 0) - penalty);
};

export { HIGH_QUALITY_DEMAND_MIN };
