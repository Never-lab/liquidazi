import { describe, expect, it } from "vitest";
import { migrateHoldingState } from "./migrateHolding";
import { createInitialGameState } from "./types";

describe("migrateHoldingState", () => {
  it("fills purchasePrice from EBITDA × 10 and defaults", () => {
    let s = createInitialGameState();
    s = {
      ...s,
      subsidiaries: [
        {
          id: 1,
          name: "Old Co",
          sector: "servizi",
          monthlyEbitda: 500,
          capacityBonus: 0,
          monthsOwned: 3,
          risk: "med",
        } as any,
      ],
    };
    delete (s as any).holdingSlotCap;
    delete (s as any).saleOffers;
    s.ytd = { revenue: 0, purchases: 0, payrollCost: 0, interest: 0, otherCosts: 0 } as any;
    const m = migrateHoldingState(s);
    expect(m.holdingSlotCap).toBe(4);
    expect(m.saleOffers).toEqual([]);
    expect(m.ytd.capitalGains).toBe(0);
    expect(m.subsidiaries[0]!.purchasePrice).toBe(5000);
    expect(m.subsidiaries[0]!.listedUntilMonthIdx).toBeNull();
    expect(m.subsidiaries[0]!.capexCooldownMonths).toBe(0);
  });
});
