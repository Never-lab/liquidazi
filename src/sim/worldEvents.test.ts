import { describe, expect, it } from "vitest";
import {
  applyChains,
  chainKeyFamily,
  chainKeyId,
  effectiveWeight,
  pickWeighted,
  type ChainBoost,
  type WorldEventMeta,
} from "./worldEvents";

const meta = (
  id: string,
  family: WorldEventMeta["family"],
  weight = 1,
  chains: WorldEventMeta["chains"] = [],
): WorldEventMeta => ({
  id,
  family,
  spawn: "weighted",
  weight,
  chains,
});

describe("pickWeighted", () => {
  it("picks the only positive weight", () => {
    const items = [meta("a", "ambientale", 0), meta("b", "logistico", 5)];
    const picked = pickWeighted(items, (m) => m.weight, () => 0.99);
    expect(picked?.id).toBe("b");
  });

  it("returns undefined if all weights are 0", () => {
    expect(pickWeighted([meta("a", "ambientale", 0)], (m) => m.weight, () => 0.5)).toBeUndefined();
  });
});

describe("effectiveWeight + chains", () => {
  it("boosts target id on following months only", () => {
    const landslide = meta("shock_landslide", "ambientale", 1, [
      { target: "id:shock_road_block", months: 2, mul: 4 },
    ]);
    const boosts: ChainBoost[] = [];
    applyChains(boosts, landslide, 8);
    expect(effectiveWeight(1, boosts, "shock_road_block", "logistico", 8)).toBe(1);
    expect(effectiveWeight(1, boosts, "shock_road_block", "logistico", 9)).toBe(4);
    expect(effectiveWeight(1, boosts, "shock_road_block", "logistico", 10)).toBe(4);
    expect(effectiveWeight(1, boosts, "shock_road_block", "logistico", 11)).toBe(1);
  });

  it("does not force the follow-up (other ids stay at base)", () => {
    const boosts: ChainBoost[] = [];
    applyChains(boosts, meta("shock_landslide", "ambientale", 1, [
      { target: chainKeyId("shock_road_block"), months: 2, mul: 4 },
    ]), 5);
    expect(effectiveWeight(1, boosts, "shock_fire", "ambientale", 6)).toBe(1);
  });

  it("family target multiplies every event in that family", () => {
    const boosts: ChainBoost[] = [];
    applyChains(boosts, meta("shock_quake", "ambientale", 1, [
      { target: chainKeyFamily("logistico"), months: 1, mul: 2 },
    ]), 3);
    expect(effectiveWeight(3, boosts, "shock_traffic", "logistico", 4)).toBe(6);
    expect(effectiveWeight(3, boosts, "shock_fire", "ambientale", 4)).toBe(3);
  });
});
