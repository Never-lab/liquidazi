import { describe, expect, it } from "vitest";
import { adsStubEnabled } from "./adsStub";

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
