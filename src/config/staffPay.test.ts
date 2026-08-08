import { describe, expect, it } from "vitest";
import {
  ANNUAL_STAFF_ONERI_FLOOR,
  ANNUAL_STAFF_ONERI_RATE,
  annualOneriForEmployee,
  totalAnnualStaffOneri,
} from "./staffPay";

describe("annual staff oneri", () => {
  it("usa floor quando RAL×rate è sotto", () => {
    // gross 1000 → RAL 13000 → ×0.035 = 455; Operaio floor 400 → 455
    expect(annualOneriForEmployee("Operaio", 1000)).toBe(455);
    // gross 500 → RAL 6500 → ×0.035 = 227.5 → floor 400
    expect(annualOneriForEmployee("Operaio", 500)).toBe(400);
  });

  it("scala sul headcount", () => {
    const one = annualOneriForEmployee("Operaio", 1650);
    expect(totalAnnualStaffOneri([])).toBe(0);
    expect(
      totalAnnualStaffOneri([
        { role: "Operaio", grossMonthly: 1650 },
        { role: "Operaio", grossMonthly: 1650 },
      ]),
    ).toBe(one * 2);
  });

  it("rate e floor matchano lo spec", () => {
    expect(ANNUAL_STAFF_ONERI_RATE).toBe(0.035);
    expect(ANNUAL_STAFF_ONERI_FLOOR.Operaio).toBe(400);
    expect(ANNUAL_STAFF_ONERI_FLOOR.Impiegato).toBe(550);
    expect(ANNUAL_STAFF_ONERI_FLOOR.Responsabile).toBe(700);
  });
});
