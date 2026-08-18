import type { Opportunity } from "./types";

export type BoardFilter = "in" | "out" | "all";

export const BOARD_FILTER_LABEL: Record<BoardFilter, string> = {
  in: "Solo entrate",
  out: "Solo forniture",
  all: "Tutte",
};

export const nextBoardFilter = (filter: BoardFilter): BoardFilter =>
  filter === "in" ? "out" : filter === "out" ? "all" : "in";

/** Default desk: income first, higher net first. */
export const visibleOpportunities = (
  ops: readonly Opportunity[],
  filter: BoardFilter,
): Opportunity[] => {
  const filtered =
    filter === "all"
      ? [...ops]
      : ops.filter((o) => (filter === "in" ? o.kind === "sale" : o.kind === "supply"));
  return filtered.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "sale" ? -1 : 1;
    return b.net - a.net || a.id - b.id;
  });
};
