import { describe, expect, it } from "vitest";
import { adsStubEnabled, shouldRenderAdSlot } from "./adsStub";

describe("adsStubEnabled", () => {
  it("defaults on in production when unset", () => {
    expect(adsStubEnabled({ PROD: true })).toBe(true);
  });

  it("defaults off in development when unset", () => {
    expect(adsStubEnabled({ PROD: false })).toBe(false);
  });

  it("VITE_ADS_STUB=0 forces off even in prod", () => {
    expect(adsStubEnabled({ PROD: true, VITE_ADS_STUB: "0" })).toBe(false);
  });

  it("VITE_ADS_STUB=1 forces on even in dev", () => {
    expect(adsStubEnabled({ PROD: false, VITE_ADS_STUB: "1" })).toBe(true);
  });
});

describe("shouldRenderAdSlot", () => {
  it("shows landing slots in development by default", () => {
    expect(shouldRenderAdSlot("landing-mid", { PROD: false })).toBe(true);
    expect(shouldRenderAdSlot("landing-footer", { PROD: false })).toBe(true);
  });

  it("hides landing slots when VITE_ADS_STUB=0", () => {
    expect(shouldRenderAdSlot("landing-mid", { PROD: true, VITE_ADS_STUB: "0" })).toBe(false);
  });

  it("keeps in-game rails off in development by default", () => {
    expect(shouldRenderAdSlot("rail-left", { PROD: false })).toBe(false);
  });
});
