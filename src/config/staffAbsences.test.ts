import { describe, expect, it } from "vitest";
import { absenceFlMult, STAFF_EVENT_TEMPLATES } from "./staffAbsences";

describe("staffAbsences config", () => {
  it("ogni template ha id univoco", () => {
    const ids = STAFF_EVENT_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("paternità e permesso riducono FL al 50%", () => {
    expect(absenceFlMult("paternita")).toBe(0.5);
    expect(absenceFlMult("permesso")).toBe(0.5);
  });

  it("malattia e maternità azzerano FL", () => {
    expect(absenceFlMult("malattia")).toBe(0);
    expect(absenceFlMult("maternita")).toBe(0);
  });
});
