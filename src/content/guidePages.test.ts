import { describe, expect, it } from "vitest";
import { guidePages } from "./guidePages";

describe("guidePages", () => {
  it("exposes at least one chapter with id, title, body", () => {
    expect(guidePages.length).toBeGreaterThanOrEqual(1);
    const first = guidePages[0]!;
    expect(first.id).toBeTruthy();
    expect(first.title).toBeTruthy();
    expect(first.body.length).toBeGreaterThan(10);
  });

  it("starts with come-si-gioca", () => {
    expect(guidePages[0]?.id).toBe("come-si-gioca");
  });
});
