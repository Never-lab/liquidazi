import { HOLDING_SLOT_BASE, HOLDING_SLOT_MAX, PURCHASE_PRICE_FALLBACK_MULT } from "../config/holding";
import { round2, type GameState, type Subsidiary } from "./types";

const migrateSub = (sub: Subsidiary): Subsidiary => ({
  ...sub,
  purchasePrice:
    typeof sub.purchasePrice === "number" && sub.purchasePrice > 0
      ? sub.purchasePrice
      : round2(sub.monthlyEbitda * PURCHASE_PRICE_FALLBACK_MULT),
  listedUntilMonthIdx: sub.listedUntilMonthIdx ?? null,
  capexCooldownMonths: sub.capexCooldownMonths ?? 0,
});

export const migrateHoldingState = (state: GameState): GameState => {
  const next = structuredClone(state);
  next.holdingSlotCap = Math.min(
    HOLDING_SLOT_MAX,
    Math.max(HOLDING_SLOT_BASE, next.holdingSlotCap ?? HOLDING_SLOT_BASE),
  );
  next.saleOffers ??= [];
  next.ytd = { ...next.ytd, capitalGains: next.ytd.capitalGains ?? 0 };
  next.subsidiaries = (next.subsidiaries ?? []).map(migrateSub);
  return next;
};
