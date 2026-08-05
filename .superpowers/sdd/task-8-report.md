# Task 8: Regressione totale — Report

**Branch:** `feat/staff-credit-monster`  
**Date:** 2026-08-05  
**Status:** ✅ PASS — no fixups required

## Step 1: Tests

```bash
npm test -- --run
```

| Metric | Result |
|--------|--------|
| Test files | 20 passed (20) |
| Tests | 117 passed (117) |
| Duration | ~983ms |
| Exit code | 0 |

## Step 2: Build

```bash
npm run build
```

| Metric | Result |
|--------|--------|
| TypeScript | `tsc -b` — success |
| Vite build | success (~154ms) |
| Exit code | 0 |
| Notes | Chunk size warning (>500 kB) — pre-existing, non-blocking |

## Step 3: Commits

None. All green with no code changes needed.

## Summary

Full regression on `feat/staff-credit-monster` is clean: 117/117 tests pass and production build completes successfully. No fixups or commits required.

---

# Whole-branch review — fixup pass

**Date:** 2026-08-05
**Status:** ✅ All findings addressed

## Critical

1. **Persist version bump 9 → 10** (`src/store/gameStore.ts`) — `GameState` shape changed since v9 (`Employee.senioritySteps`, `Loan.monthlyPayment`, `Fido.lastInterest`), so old saves must be wiped via the existing `migrate` wipe pattern rather than silently rehydrating a stale shape.
2. **Defensive `??=` defaults in `advanceMonth`** (`src/sim/advanceMonth.ts`) — added a block right after the existing `??=` normalizations that backfills `loan.monthlyPayment` (via `frenchPayment` on the current outstanding/rate/remaining tenor), `emp.senioritySteps ??= 0` for every employee, and `fido.lastInterest ??= 0`, so a save written before these fields existed can't produce `NaN` mid-simulation.

## Important

3. **Capped Impiegato ticket bonus** (`src/sim/events.ts`) — `ticketCeiling` now uses `Math.min(6000, impiegati * 1200)` instead of an uncapped `impiegati * 1200`, matching the existing staff/growth caps and closing the ticket-inflation exploit for large Impiegato counts.
4. **Fixed the untestable Impiegato lead test** (`src/sim/phase-staff-roles.test.ts`) — the old test compared 1 Operaio vs 1 Impiegato with the same RNG seed; since Operaio's own capacity bump already outpaces Impiegato's `+impiegati` sale-lead bonus by the same margin, the assertion (`toBeGreaterThanOrEqual`) was structurally unable to fail. Rewrote it to compare 1 Impiegato against a zero-staff baseline at the same seed (asserting `monthlyCapacity` is unchanged, isolating the `+impiegati` lead bonus) and now assert strictly `toBeGreaterThan`.

## Cheap minors

5. **Responsabile heat tick moved after `tickRivalHeat`** (`src/sim/advanceMonth.ts`) — the `−nResp` rival-heat reduction now runs after the end-of-month `tickRivalHeat` call instead of alongside the early compliance tick, so it applies to the month's final heat value rather than being partially overwritten by the later drift/decay logic. Compliance tick (`+2 * nResp`) stays in its original early spot. Verified numerically equivalent for the existing unit test (linear ops, same result either order) while being correct for cases where heat clamps at 0/100 boundaries.
6. **`fido.lastInterest` reset to 0 when `drawn` is 0** (`src/sim/advanceMonth.ts`) — added a check after the fido interest/repayment block so a fully repaid (or never-drawn) fido doesn't keep showing a stale nonzero "last interest" figure.
7. **`canRequestLoan` simplified** (`src/sim/actions.ts`) — now derives from `loanRefusalReason(...) === null` instead of duplicating the same guard logic, removing the duplication called out in review.
8. **`baseGrossFor` cast guarded in seniority loop** (`src/sim/advanceMonth.ts`) — the anzianità loop now checks `emp.role` against the known `StaffRole` set before recomputing `grossMonthly`; employees with a legacy/unknown role (e.g. test fixtures using `role: "Test"`) keep their existing `grossMonthly` unchanged instead of resolving to `undefined`/`NaN` via `CCNL_BASE_GROSS[sector][role]`.

## Verification

```bash
npm test -- --run && npm run build
```

| Metric | Result |
|--------|--------|
| Test files | 20 passed (20) |
| Tests | 117 passed (117) |
| Build | `tsc -b && vite build` — success |
| Exit code | 0 |

## Commits

- `fix(persist,staff): bump save version to 10 and harden advanceMonth against legacy saves` — critical fixes (1, 2, 8, minor 5/6).
- `fix(events,tests): cap Impiegato ticket bonus, simplify canRequestLoan, fix untestable Impiegato-lead test` — important fixes (3, 4) + minor (7).

No large refactors performed; all changes are surgical and scoped to the reviewed findings.
