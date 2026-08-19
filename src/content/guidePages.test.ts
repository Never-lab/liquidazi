import { describe, expect, it } from "vitest";
import { guidePages } from "./guidePages";

describe("guidePages", () => {
  it("espone capitoli con id, titolo, body; il primo e come-si-gioca", () => {
    expect(guidePages.length).toBeGreaterThanOrEqual(1);
    const first = guidePages[0]!;
    expect(first.id).toBe("come-si-gioca");
    expect(first.title).toBeTruthy();
    expect(first.body.length).toBeGreaterThan(10);
  });
});
