import { beforeEach, describe, expect, it } from "vitest";
import {
  ADS_CONSENT_KEY,
  getAdsConsentSnapshot,
  readAdsConsent,
  resetAdsConsentCache,
  writeAdsConsent,
} from "./adsConsent";

const memStorage = (): Storage => {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => {
      map.set(k, String(v));
    },
    removeItem: (k) => {
      map.delete(k);
    },
    key: () => null,
  };
};

describe("adsConsent", () => {
  beforeEach(() => {
    resetAdsConsentCache();
  });

  it("reads null when unset", () => {
    expect(readAdsConsent(memStorage())).toBe(null);
  });

  it("persists accepted and rejected", () => {
    const s = memStorage();
    writeAdsConsent("accepted", s);
    expect(s.getItem(ADS_CONSENT_KEY)).toBe("accepted");
    expect(readAdsConsent(s)).toBe("accepted");
    writeAdsConsent("rejected", s);
    expect(readAdsConsent(s)).toBe("rejected");
  });

  it("getAdsConsentSnapshot uses write cache", () => {
    const s = memStorage();
    writeAdsConsent("accepted", s);
    expect(getAdsConsentSnapshot()).toBe("accepted");
  });
});
