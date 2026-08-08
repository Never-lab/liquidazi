import { describe, expect, it } from "vitest";
import {
  pressureBand,
  pressureBandLabel,
  rivalPhase,
} from "./rival";

describe("rival pressure helpers", () => {
  it("pressureBand thresholds", () => {
    expect(pressureBand(0)).toBe("calma");
    expect(pressureBand(39)).toBe("calma");
    expect(pressureBand(40)).toBe("tesa");
    expect(pressureBand(69)).toBe("tesa");
    expect(pressureBand(70)).toBe("guerra");
    expect(pressureBand(100)).toBe("guerra");
  });

  it("rivalPhase by monthsPlayed", () => {
    expect(rivalPhase(0)).toBe("arrivo");
    expect(rivalPhase(5)).toBe("arrivo");
    expect(rivalPhase(6)).toBe("caldo");
    expect(rivalPhase(17)).toBe("caldo");
    expect(rivalPhase(18)).toBe("resa");
  });

  it("labels Italian", () => {
    expect(pressureBandLabel("calma")).toBe("Calma");
    expect(pressureBandLabel("tesa")).toBe("Tesa");
    expect(pressureBandLabel("guerra")).toBe("Guerra");
  });
});
