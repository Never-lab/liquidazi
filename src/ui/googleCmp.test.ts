import { describe, expect, it, vi } from "vitest";
import { CONSENT_SETTINGS_LABEL, openGoogleConsentSettings } from "./googleCmp";

describe("openGoogleConsentSettings", () => {
  it("uses TCF displayConsentUi when available", () => {
    const tcf = vi.fn();
    expect(
      openGoogleConsentSettings({ __tcfapi: tcf } as unknown as Window),
    ).toBe(true);
    expect(tcf).toHaveBeenCalledWith("displayConsentUi", 2, expect.any(Function));
  });

  it("falls back to Funding Choices revocation message", () => {
    const showRevocationMessage = vi.fn();
    expect(
      openGoogleConsentSettings({
        googlefc: { showRevocationMessage },
      } as unknown as Window),
    ).toBe(true);
    expect(showRevocationMessage).toHaveBeenCalled();
  });

  it("returns false when no CMP API is present", () => {
    expect(openGoogleConsentSettings({} as unknown as Window)).toBe(false);
  });
});

describe("consent footer copy", () => {
  it("labels the footer control for ad privacy choices", () => {
    expect(CONSENT_SETTINGS_LABEL).toMatch(/annunci/i);
  });
});
