/** Commercial reputation: local 0–100 plus municipal / national layers. */

import { pickWeighted } from "./worldEvents";
import type { GameState, MarketLayer } from "./types";

const clamp = (n: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, n));

export const LOCAL_PAYS_PER_MUNICIPAL = 5;
export const LOCAL_LAYER_WEIGHT = 8;
export const MUNICIPAL_NET_MIN = 25000;
export const MUNICIPAL_NET_MAX = 40000;
export const NATIONAL_NET_MIN = 50000;
export const NATIONAL_NET_MAX = 150000;
export const MAX_AR_NET = NATIONAL_NET_MAX;
export const MAX_AR_TERM_MONTHS = 36;

export const MARKET_LAYER_LABEL: Record<MarketLayer, string> = {
  local: "Locale",
  municipal: "Comunale",
  national: "Nazionale",
};

/** Extra monthly capacity slots from reputation. */
export const repSlotBonus = (reputation: number): number =>
  clamp(Math.round(reputation / 20), 0, 5);

/** Multiplier on board saleTarget count. */
export const repDemandMult = (reputation: number): number =>
  0.75 + reputation / 200;

/** Multiplier on contract offer probabilities. */
export const repContractMult = (reputation: number): number =>
  clamp(0.55 + reputation / 200, 0.4, 1.1);

/** Multiplier on private AR default chance. */
export const repDefaultMult = (reputation: number): number =>
  1.45 - reputation / 200;

export const pickMarketLayer = (
  municipal: number,
  national: number,
  rand: () => number,
): MarketLayer => {
  const layers: MarketLayer[] = ["local", "municipal", "national"];
  return (
    pickWeighted(
      layers,
      (layer) => {
        if (layer === "local") return LOCAL_LAYER_WEIGHT;
        if (layer === "municipal") return Math.max(0, municipal);
        return Math.max(0, national);
      },
      rand,
    ) ?? "local"
  );
};

const bumpMunicipal = (state: GameState): void => {
  const next = Math.min(100, (state.company.repMunicipal ?? 0) + 1);
  state.company.repMunicipal = next;
  state.company.repNational = Math.min(20, Math.floor(next / 5));
};

/** Points on AR cash-in only. National jobs do not raise national (derived from municipal). */
export const applyLayerCredit = (state: GameState, layer: MarketLayer): void => {
  if (layer === "national") return;
  if (layer === "municipal") {
    bumpMunicipal(state);
    return;
  }
  state.company.reputation = Math.min(100, state.company.reputation + 1);
  state.localPaysTowardMunicipal = (state.localPaysTowardMunicipal ?? 0) + 1;
  if (state.localPaysTowardMunicipal >= LOCAL_PAYS_PER_MUNICIPAL) {
    state.localPaysTowardMunicipal = 0;
    bumpMunicipal(state);
  }
};

export const layerFromInvoice = (inv: {
  marketLayer?: MarketLayer;
  clientType?: string;
}): MarketLayer =>
  inv.marketLayer ?? (inv.clientType === "pa" ? "municipal" : "local");
