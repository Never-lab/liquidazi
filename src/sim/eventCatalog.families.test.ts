import { describe, expect, it } from "vitest";
import { forcedShockCount, worldMetaOf } from "./eventCatalog";
import { moraIncrement, applyChains, chainKeyId } from "./worldEvents";
import type { ChainBoost } from "./worldEvents";

describe("event families catalog", () => {
  it("tags existing ambiental shocks", () => {
    expect(worldMetaOf("shock_fire")?.family).toBe("ambientale");
    expect(worldMetaOf("shock_quake")?.family).toBe("ambientale");
    expect(worldMetaOf("shock_flood")?.family).toBe("ambientale");
    expect(worldMetaOf("shock_heat")?.family).toBe("ambientale");
  });

  it("leaves untagged leftover shocks out of families", () => {
    expect(worldMetaOf("shock_cyber")).toBeUndefined();
    expect(worldMetaOf("shock_rival_raid")).toBeUndefined();
  });

  it("adds vault events into the shock pool", () => {
    expect(worldMetaOf("shock_landslide")?.family).toBe("ambientale");
    expect(worldMetaOf("shock_road_block")?.family).toBe("logistico");
    expect(worldMetaOf("shock_delivery_delay")?.family).toBe("logistico");
    expect(worldMetaOf("shock_late_pay")?.family).toBe("burocratico");
    expect(forcedShockCount()).toBeGreaterThanOrEqual(26);
  });

  it("cartella is system spawn, not a weighted shock", () => {
    expect(worldMetaOf("fiscal_cartella")?.spawn).toBe("system");
    expect(worldMetaOf("fiscal_cartella")?.family).toBe("burocratico");
  });
});

describe("cartella mora boost", () => {
  it("doubles overdue step only while chain is active", () => {
    const boosts: ChainBoost[] = [];
    applyChains(
      boosts,
      { chains: [{ target: chainKeyId("fiscal_cartella"), months: 2, mul: 2 }] },
      4,
    );
    expect(moraIncrement(boosts, 4)).toBe(1);
    expect(moraIncrement(boosts, 5)).toBe(2);
    expect(moraIncrement(boosts, 7)).toBe(1);
  });
});
