import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALMANAGER_URL, localManagerUrl } from "./localManagerUrl";

describe("localManagerUrl", () => {
  it("falls back to the default Railway build when env empty", () => {
    expect(localManagerUrl({ VITE_LOCALMANAGER_URL: "" })).toBe(DEFAULT_LOCALMANAGER_URL);
    expect(localManagerUrl({ VITE_LOCALMANAGER_URL: "   " })).toBe(DEFAULT_LOCALMANAGER_URL);
  });

  it("returns null when override is invalid", () => {
    expect(localManagerUrl({ VITE_LOCALMANAGER_URL: "not-a-url" })).toBe(null);
    expect(localManagerUrl({ VITE_LOCALMANAGER_URL: "ftp://x.example" })).toBe(null);
  });

  it("accepts http(s) overrides", () => {
    expect(localManagerUrl({ VITE_LOCALMANAGER_URL: " https://lm.example/ " })).toBe(
      "https://lm.example/",
    );
  });
});
