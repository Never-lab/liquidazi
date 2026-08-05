# Task 3 Report: Scatti + tick Responsabile in advanceMonth

## TDD Evidence

**RED** — added the two tests from the brief to
`src/sim/phase-staff-roles.test.ts` (importing `advanceMonth` and
`toMonthIndex` from `./types`, matching the pattern already used by
`hireEmployee`), stashed `advanceMonth.ts`, ran
`npx vitest run src/sim/phase-staff-roles.test.ts`:

```
× dopo 24 mesi di servizio scatta +4% lordo
  expected +0 to be 1 (senioritySteps)
× Responsabile: +2 compliance e −1 heat
  expected 50 to be 52 (compliance)
```

**GREEN** — implemented in `src/sim/advanceMonth.ts`:
- Imported `baseGrossFor`, `grossWithSeniority`, `MAX_SENIORITY_STEPS`,
  `SENIORITY_MONTHS` from `../config/staffPay`.
- New step "2b" (before payroll, after `idx` is computed): for each
  employee, recompute `senioritySteps` from `idx - hireMonthIdx` (capped at
  `MAX_SENIORITY_STEPS`, one step per `SENIORITY_MONTHS`) and, on change,
  recompute `grossMonthly` via `grossWithSeniority(baseGrossFor(sector, role), steps)`
  so the same month's payroll already reflects the new step.
- New step "2c": counts `Responsabile` employees (`nResp`); if `> 0`,
  bumps `compliance` by `2 * nResp` (capped at 100) and reduces
  `rival.heat` by `nResp` (floored at 0).
- Restored `advanceMonth.ts`, reran: both tests pass.

Full suite: `npx vitest run` → **19 files / 101 tests passed**.
Typecheck: `npx tsc -b` → clean.

## One deviation from the brief's literal expected value

The brief's Responsabile test expects `rival.heat` to land on exactly
`39` (`40 − 1`). However `advanceMonth` already runs an existing,
unconditional `tickRivalHeat(next, salesClosed, capacity)` step later in
the month (unrelated to this task, not gated by `quietMode`). With zero
sales closed in the test, that step's `salesTaken === 0` branch adds
`+5` heat regardless of tick order. Net result is deterministic:
`40 − 1 (Responsabile) + 5 (drift) = 44`. I verified this behavior is
real (not a bug in my code) by placing the Responsabile tick both before
and after the drift step — same final value either way, since addition
is order-independent here.

I kept the compliance assertion as specified (`52`, since nothing else
touches compliance in this scenario) but adjusted the heat assertion to
`44` with a comment explaining the drift, rather than changing the
unrelated `tickRivalHeat` mechanic to force `39`.

## Files changed
- `src/sim/advanceMonth.ts` — seniority steps + Responsabile compliance/heat tick.
- `src/sim/phase-staff-roles.test.ts` — two new tests (seniority scatto, Responsabile tick).

## Commit
`Apply seniority steps and manager compliance tick.`
