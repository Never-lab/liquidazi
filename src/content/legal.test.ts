import { describe, expect, it } from "vitest";
import { LEGAL_PAGES } from "../content/legal";

describe("legal copy", () => {
  it("privacy names stored data and in-app contact", () => {
    const text = LEGAL_PAGES.privacy.sections.map((s) => s.body).join(" ");
    expect(text).toMatch(/username/i);
    expect(text).toMatch(/localStorage/i);
    expect(text).toMatch(/Plausible/i);
    expect(text).toMatch(/AdSense/i);
    expect(text).toMatch(/Feedback/i);
    expect(text).toMatch(/log tecnico/i);
    expect(text).toMatch(/IP/);
    expect(LEGAL_PAGES.privacy.title).toBe("Privacy");
  });

  it("terms say educational sim, not tax advice", () => {
    const text = LEGAL_PAGES.termini.sections.map((s) => s.body).join(" ");
    expect(text).toMatch(/educativ/i);
    expect(text).toMatch(/consulenza fiscale/i);
    expect(LEGAL_PAGES.termini.title).toBe("Termini");
  });
});
