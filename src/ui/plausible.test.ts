import { describe, expect, it } from "vitest";
import { opsTrafficLinks, plausibleConfig } from "./plausible";

describe("plausibleConfig", () => {
  it("null when domain unset", () => {
    expect(plausibleConfig({ VITE_PLAUSIBLE_DOMAIN: "" })).toBe(null);
  });

  it("defaults script src", () => {
    expect(plausibleConfig({ VITE_PLAUSIBLE_DOMAIN: "liquidazi.example" })).toEqual({
      domain: "liquidazi.example",
      scriptSrc: "https://plausible.io/js/script.js",
    });
  });
});

describe("opsTrafficLinks", () => {
  it("returns nulls when unset", () => {
    expect(opsTrafficLinks({})).toEqual({
      gscUrl: null,
      plausibleDashboardUrl: null,
    });
  });

  it("trims urls", () => {
    expect(
      opsTrafficLinks({
        VITE_GSC_URL: " https://search.google.com/search-console ",
        VITE_PLAUSIBLE_DASHBOARD_URL: "https://plausible.io/liquidazi.example",
      }),
    ).toEqual({
      gscUrl: "https://search.google.com/search-console",
      plausibleDashboardUrl: "https://plausible.io/liquidazi.example",
    });
  });
});
