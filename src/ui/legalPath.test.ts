import { describe, expect, it } from "vitest";
import { legalPageFromPath } from "./legalPath";

describe("legalPageFromPath", () => {
  it("maps /privacy and /termini, ignoring a trailing slash", () => {
    expect(legalPageFromPath("/privacy")).toBe("privacy");
    expect(legalPageFromPath("/privacy/")).toBe("privacy");
    expect(legalPageFromPath("/termini")).toBe("termini");
    expect(legalPageFromPath("/termini/")).toBe("termini");
  });

  it("returns null for the rest of the app", () => {
    expect(legalPageFromPath("/")).toBe(null);
    expect(legalPageFromPath("/ops")).toBe(null);
    expect(legalPageFromPath("/privacy-policy")).toBe(null);
  });
});
