# Task 5 report — Loan math: estimate, schedule, French installment

## TDD evidence

1. **Failing tests first**: created `src/sim/phase-loan-schedule.test.ts` (9 tests) against
   `monthlyRateFromAnnual`, `frenchPayment`, `buildLoanSchedule`, `remainingSchedule` before
   they existed. Ran `npx vitest run src/sim/phase-loan-schedule.test.ts` →
   **9/9 failed** (`TypeError: ... is not a function`).
2. **Implemented helpers** in `src/sim/actions.ts` exactly per brief signatures
   (`monthlyRateFromAnnual`, `frenchPayment`, `ScheduleRow`, `buildLoanSchedule`,
   `remainingSchedule`); `buildLoanSchedule` delegates to `remainingSchedule(principal, ...)`.
3. Added `monthlyPayment: number` to `Loan` interface (`src/sim/types.ts`); `requestLoan`
   now computes `monthlyPayment = frenchPayment(principal, originationAnnualRate, tenorMonths)`
   at origination (origination rate = euribor-at-signing + spread, used as the "expected" rate
   for floating loans too, per brief).
4. `advanceMonth.ts` loan block rewritten: `interest = outstanding * annualRate / 12`;
   `principalShare = monthlyPayment - interest`, clamped to `[0, outstanding]` and forced to
   full `outstanding` on the final scheduled month — matches brief's preferred "stable rata"
   approach.
5. Re-ran `npx vitest run src/sim/phase-loan-schedule.test.ts` → **9/9 passed**.
6. Updated `src/sim/phase6.loan.test.ts`:
   - "rata fissa" test rewritten to assert French schedule row 0 (via `buildLoanSchedule`)
     matches `advanceMonth` output, and that principal share grows month-over-month while
     payment stays constant.
   - "tasso variabile" test rewritten to independently recompute the 3-month floating
     trajectory using `frenchPayment` + the same clamp rule, then compare against sim output.
   - No other test in the repo constructs a `Loan` literal directly (all go through
     `requestLoan`), so no other fixtures needed the new field.
7. Final verification:
   - `npx vitest run src/sim/phase6.loan.test.ts src/sim/phase-loan-schedule.test.ts` →
     **20/20 passed**.
   - `npx vitest run` (full suite) → **110/110 passed** (20 files).
   - `npx tsc -b --noEmit` → clean, no type errors.

## Files changed
- `src/sim/actions.ts` — new helpers + `monthlyPayment` set in `requestLoan`.
- `src/sim/advanceMonth.ts` — French installment logic in loan block.
- `src/sim/types.ts` — `Loan.monthlyPayment: number`.
- `src/sim/phase6.loan.test.ts` — updated expectations for French amortization.
- `src/sim/phase-loan-schedule.test.ts` — new (9 tests).

## Concerns
- Floating-rate loans keep a fixed `monthlyPayment` computed at origination (per brief's
  "stable rata" preference); actual amortization pace drifts with Euribor since principal
  share = payment − actual interest, clamped. This is intentional per brief, not a bug.
- `LoanPanel.tsx` UI was not updated to surface `monthlyPayment`/schedule — out of scope per
  task's required file list, flagging for a future UI task if desired.

## Commit
`Use French amortization for loans and expose schedule helpers.`
