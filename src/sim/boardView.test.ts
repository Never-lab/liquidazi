import { describe, expect, it } from "vitest";
import { nextBoardFilter, visibleOpportunities } from "./boardView";
import type { Opportunity } from "./types";

const op = (id: number, kind: Opportunity["kind"], net: number): Opportunity => ({
  id,
  kind,
  title: `${kind}-${id}`,
  net,
  expiresInMonths: 1,
  termMonths: 1,
});

describe("visibleOpportunities", () => {
  const board = [op(1, "supply", 800), op(2, "sale", 1200), op(3, "sale", 400)];

  it("default in: only sales, higher net first", () => {
    expect(visibleOpportunities(board, "in").map((o) => o.id)).toEqual([2, 3]);
  });

  it("out: only supplies", () => {
    expect(visibleOpportunities(board, "out").map((o) => o.id)).toEqual([1]);
  });

  it("all: sales then supplies, net desc within kind", () => {
    expect(visibleOpportunities(board, "all").map((o) => o.id)).toEqual([2, 3, 1]);
  });

  it("cycles filter", () => {
    expect(nextBoardFilter("in")).toBe("out");
    expect(nextBoardFilter("out")).toBe("all");
    expect(nextBoardFilter("all")).toBe("in");
  });
});
