### Task 5: Loan math â€” estimate, schedule, French installment in sim

**Files:**
- Modify: `src/sim/actions.ts` (add helpers; optionally keep spread helpers)
- Modify: `src/sim/advanceMonth.ts` (rata francese)
- Create: `src/sim/phase-loan-schedule.test.ts`
- Update: `src/sim/phase6.loan.test.ts` se le asserzioni su principalShare lineare falliscono

**Interfaces:**
- Produces:

```ts
export const monthlyRateFromAnnual = (annual: number): number => annual / 12;

export const frenchPayment = (principal: number, annualRate: number, tenorMonths: number): number => {
  if (tenorMonths <= 0) return 0;
  const r = monthlyRateFromAnnual(annualRate);
  if (r <= 0) return round2(principal / tenorMonths);
  const pow = (1 + r) ** tenorMonths;
  return round2((principal * r * pow) / (pow - 1));
};

export type ScheduleRow = {
  monthIndex: number; // 1-based installment number
  interest: number;
  principal: number;
  payment: number;
  residual: number;
};

export const buildLoanSchedule = (
  principal: number,
  annualRate: number,
  tenorMonths: number,
): ScheduleRow[] => { /* simulate from full principal */ };

export const remainingSchedule = (
  outstanding: number,
  annualRate: number,
  monthsLeft: number,
): ScheduleRow[] => { /* from current outstanding */ };
```

`advanceMonth` loan block:

```ts
const annualRate = /* same as now */;
const monthsLeft = Math.max(1, loan.tenorMonths - loan.monthsPaid);
const payment = frenchPayment(loan.outstanding, annualRate, monthsLeft);
// OR better: store original payment at origination
```

**Preferred (stable rata):** at `requestLoan`, compute and store `loan.monthlyPayment = frenchPayment(principal, fixedOrExpectedRate, tenorMonths)`. Each month:

```ts
const interest = round2((loan.outstanding * annualRate) / 12);
let principalShare = round2(loan.monthlyPayment - interest);
if (loan.monthsPaid + 1 >= loan.tenorMonths || principalShare > loan.outstanding) {
  principalShare = loan.outstanding;
}
const payment = round2(interest + principalShare);
```

Add to `Loan` interface in `types.ts`: `monthlyPayment: number`.

- [ ] **Step 1: Failing tests** in `phase-loan-schedule.test.ts`

```ts
it("somma capitali â‰ˆ principal; residuo finale 0", () => {
  const P = 12000;
  const annual = 0.05;
  const n = 12;
  const rows = buildLoanSchedule(P, annual, n);
  expect(rows).toHaveLength(12);
  const sumP = rows.reduce((s, r) => s + r.principal, 0);
  expect(sumP).toBeCloseTo(P, 0);
  expect(rows[n - 1]!.residual).toBeCloseTo(0, 0);
});
```

- [ ] **Step 2: Implement helpers + `monthlyPayment` on loan + advanceMonth**

- [ ] **Step 3: Fix `phase6.loan.test.ts`** to assert French interest/principal (recompute expected with helpers).

- [ ] **Step 4: `npm test -- --run src/sim/phase6.loan.test.ts src/sim/phase-loan-schedule.test.ts` PASS

- [ ] **Step 5: Commit**

```bash
git commit -am "Use French amortization for loans and expose schedule helpers."
```

---
