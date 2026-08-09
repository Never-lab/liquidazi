import { describe, expect, it } from "vitest";
import {
  DEFAULT_ADSENSE_CLIENT,
  DEFAULT_ADSENSE_SLOT,
  adsenseConfig,
  adsenseFullWidth,
} from "./adsense";

describe("adsenseConfig", () => {
  it("falls back to Liquidazi defaults when env empty", () => {
    expect(adsenseConfig({ VITE_ADSENSE_CLIENT: "", VITE_ADSENSE_SLOT: "" })).toEqual({
      client: DEFAULT_ADSENSE_CLIENT,
      slot: DEFAULT_ADSENSE_SLOT,
    });
  });

  it("allows env override", () => {
    expect(
      adsenseConfig({
        VITE_ADSENSE_CLIENT: "ca-pub-111",
        VITE_ADSENSE_SLOT: "999",
      }),
    ).toEqual({ client: "ca-pub-111", slot: "999" });
  });

  it("rejects invalid client or slot", () => {
    expect(
      adsenseConfig({
        VITE_ADSENSE_CLIENT: "pub-nope",
        VITE_ADSENSE_SLOT: "4293531391",
      }),
    ).toBe(null);
    expect(
      adsenseConfig({
        VITE_ADSENSE_CLIENT: "ca-pub-1",
        VITE_ADSENSE_SLOT: "abc",
      }),
    ).toBe(null);
  });
});

describe("adsenseFullWidth", () => {
  it("enables on landing and end banner only", () => {
    expect(adsenseFullWidth("landing-mid")).toBe(true);
    expect(adsenseFullWidth("end-banner")).toBe(true);
    expect(adsenseFullWidth("rail-left")).toBe(false);
    expect(adsenseFullWidth("rail-right")).toBe(false);
  });
});
