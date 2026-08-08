import { describe, expect, it } from "vitest";
import { createInitialGameState } from "./types";
import {
  acceptOpportunity,
  generateOpportunities,
  maxDealNet,
  seedNewGame,
} from "./events";
import { issueCustomerInvoice } from "./actions";

describe("deal caps and opportunities", () => {
  it("caps early-game deals well below 500k", () => {
    const s = seedNewGame(createInitialGameState({ city: "058091", sector: "commercio" }));
    expect(maxDealNet(s)).toBeLessThan(5000);
    expect(maxDealNet(s)).toBeGreaterThan(300);
  });

  it("blocks absurd free-typed invoices", () => {
    const s = createInitialGameState();
    const next = issueCustomerInvoice(s, 500_000);
    expect(next.invoices).toHaveLength(0);
  });

  it("accepting a sale opportunity creates an AR invoice of that size", () => {
    const s = seedNewGame(createInitialGameState({ city: "058091", sector: "servizi" }));
    const sale = s.opportunities.find((o) => o.kind === "sale");
    expect(sale).toBeTruthy();
    const next = acceptOpportunity(s, sale!.id);
    expect(next.invoices.some((i) => i.kind === "AR")).toBe(true);
    expect(next.opportunities.find((o) => o.id === sale!.id)).toBeUndefined();
  });

  it("generates a board scaled to capacity (not a fixed 2–3)", () => {
    const s = createInitialGameState({ city: "015146", sector: "ristorazione" });
    const { ops } = generateOpportunities(s, { forceRegime: "normale" });
    expect(ops.filter((o) => o.kind === "sale").length).toBeGreaterThanOrEqual(1);
    expect(ops.length).toBeLessThanOrEqual(10);
    expect(ops.every((o) => o.net <= maxDealNet(s))).toBe(true);
  });
});
