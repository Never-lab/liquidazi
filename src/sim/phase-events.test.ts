import { describe, expect, it } from "vitest";
import { createInitialGameState } from "./types";
import {
  acceptOpportunity,
  generateOpportunities,
  LOCAL_SALE_NET_MIN,
  maxDealNet,
  seedNewGame,
} from "./events";
import { issueCustomerInvoice } from "./actions";

describe("deal caps and opportunities", () => {
  it("caps early-game deals well below 500k", () => {
    const s = seedNewGame(createInitialGameState({ city: "058091", sector: "commercio" }));
    expect(maxDealNet(s)).toBeLessThan(5000);
    expect(maxDealNet(s)).toBeGreaterThanOrEqual(LOCAL_SALE_NET_MIN);
  });

  it("local sales never fall below the early-game floor", () => {
    const sectors = ["commercio", "servizi", "artigianato", "ristorazione"] as const;
    for (const sector of sectors) {
      const s = createInitialGameState({ city: "015146", sector });
      const { ops } = generateOpportunities(s, { forceRegime: "normale" });
      const localSales = ops.filter(
        (o) => o.kind === "sale" && (o.marketLayer ?? "local") === "local",
      );
      for (const sale of localSales) {
        expect(sale.net).toBeGreaterThanOrEqual(LOCAL_SALE_NET_MIN);
      }
    }
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
    const sales = ops.filter((o) => o.kind === "sale");
    expect(sales.every((o) => (o.marketLayer ?? "local") !== "local" || o.net <= maxDealNet(s))).toBe(true);
  });
});
