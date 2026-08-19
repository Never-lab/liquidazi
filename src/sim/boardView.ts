import { classifyOffer } from "../ui/opportunityCopy";
import type { MarketLayer, Opportunity } from "./types";

export type BoardFilter = "in" | "out" | "all";
export type MarketFilter = "all" | MarketLayer;
export type OfferKindFilter = "all" | "single" | "contract" | "tender";

export const BOARD_FILTER_LABEL: Record<BoardFilter, string> = {
  in: "Solo entrate",
  out: "Solo forniture",
  all: "Tutte",
};

export const MARKET_FILTER_LABEL: Record<MarketFilter, string> = {
  all: "Tutti i mercati",
  local: "Locale",
  municipal: "Comunale",
  national: "Nazionale",
};

export const OFFER_KIND_FILTER_LABEL: Record<OfferKindFilter, string> = {
  all: "Tutti i tipi",
  single: "Singole",
  contract: "Contratti",
  tender: "Appalti",
};

export const nextBoardFilter = (filter: BoardFilter): BoardFilter =>
  filter === "in" ? "out" : filter === "out" ? "all" : "in";

export const nextMarketFilter = (filter: MarketFilter): MarketFilter =>
  filter === "all"
    ? "local"
    : filter === "local"
      ? "municipal"
      : filter === "municipal"
        ? "national"
        : "all";

export const nextOfferKindFilter = (filter: OfferKindFilter): OfferKindFilter =>
  filter === "all"
    ? "single"
    : filter === "single"
      ? "contract"
      : filter === "contract"
        ? "tender"
        : "all";

/** Default desk: income first, higher net first. */
export const visibleOpportunities = (
  ops: readonly Opportunity[],
  filter: BoardFilter,
  market: MarketFilter = "all",
  offerKind: OfferKindFilter = "all",
): Opportunity[] => {
  const filtered =
    filter === "all"
      ? [...ops]
      : ops.filter((o) => (filter === "in" ? o.kind === "sale" : o.kind === "supply"));
  const byMarket =
    market === "all"
      ? filtered
      : filtered.filter(
          (o) => o.kind !== "sale" || (o.marketLayer ?? "local") === market,
        );
  const byKind =
    offerKind === "all" || filter === "out"
      ? byMarket
      : byMarket.filter((o) => o.kind !== "sale" || classifyOffer(o) === offerKind);
  return byKind.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "sale" ? -1 : 1;
    return b.net - a.net || a.id - b.id;
  });
};
