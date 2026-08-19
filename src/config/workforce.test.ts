import { describe, expect, it } from "vitest";
import {
  MUNICIPAL_NET_MAX,
  MUNICIPAL_NET_MIN,
  NATIONAL_NET_MAX,
} from "../sim/reputation";
import {
  workforceRequiredForNet,
  workforceRequiredForSale,
  WORKFORCE_BASE,
} from "./workforce";

describe("workforceRequiredForSale", () => {
  it("locale invariato sul netto pieno", () => {
    expect(workforceRequiredForSale(2000, { marketLayer: "local" })).toBe(
      workforceRequiredForNet(2000),
    );
  });

  it("comunale 25–40k non chiede centinaia di FL", () => {
    const flMin = workforceRequiredForSale(MUNICIPAL_NET_MIN, {
      marketLayer: "municipal",
      termMonths: 12,
    });
    const flMax = workforceRequiredForSale(MUNICIPAL_NET_MAX, {
      marketLayer: "municipal",
      termMonths: 6,
    });
    expect(flMin).toBeLessThanOrEqual(55);
    expect(flMax).toBeLessThanOrEqual(90);
    expect(flMax).toBeGreaterThan(flMin);
  });

  it("nazionale resta più impegnativo del comunale ma sotto 120 FL", () => {
    const municipal = workforceRequiredForSale(35000, {
      marketLayer: "municipal",
      termMonths: 12,
    });
    const national = workforceRequiredForSale(NATIONAL_NET_MAX, {
      marketLayer: "national",
      termMonths: 24,
    });
    expect(national).toBeLessThanOrEqual(110);
    expect(national).toBeGreaterThan(municipal);
  });

  it("early game: base 30 può avvicinarsi a un comunale lungo", () => {
    const fl = workforceRequiredForSale(MUNICIPAL_NET_MIN, {
      marketLayer: "municipal",
      termMonths: 12,
    });
    expect(fl).toBeLessThan(WORKFORCE_BASE + 25);
  });
});
