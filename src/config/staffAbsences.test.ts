import { describe, expect, it } from "vitest";
import { STAFF_EVENT_TEMPLATES } from "./staffAbsences";

describe("staffAbsences config", () => {
  it("ogni template ha id univoco", () => {
    const ids = STAFF_EVENT_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
