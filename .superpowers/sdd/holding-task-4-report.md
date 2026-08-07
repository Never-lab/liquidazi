# Task 4 Report: List for sale + offers + accept/reject

**Branch:** `feat/holding-flip-acq`  
**Base:** `5c85fce7e2d0c13c06a5ddaac9e918b4023fc467`  
**Commit:** `a8c8151`  
**Date:** 2026-08-07

## Summary

Implemented `listSubsidiaryForSale`, `acceptSaleOffer`, `rejectSaleOffer`, and `advanceHoldingSales`; wired offer tick into `advanceMonth` after `applySubsidiaryMonth`. TDD RED → GREEN per brief.

## TDD Evidence

### Step 1–2: RED

```
npx vitest run src/sim/phase-holding.test.ts
```

```
 FAIL  holding list + flip > list → offer → accept: cash and capitalGains
TypeError: listSubsidiaryForSale is not a function
```

### Step 4: GREEN

```
npx vitest run src/sim/phase-holding.test.ts
```

```
 Test Files  1 passed (1)
      Tests  6 passed (6)
```

### Full regression

```
npm run lint ; npm test ; npm run build
```

```
 Test Files  38 passed (38)
      Tests  215 passed (215)
 Exit code 0
```

## Files Modified

| File | Changes |
|------|---------|
| `src/sim/acquisitions.ts` | list/accept/reject + `advanceHoldingSales` |
| `src/sim/advanceMonth.ts` | call `advanceHoldingSales` after `applySubsidiaryMonth` |
| `src/sim/phase-holding.test.ts` | flip accept + CAPEX-while-listed tests |

## Implementation Details

### `listSubsidiaryForSale`

- No-op if sub missing or already listed
- `listedUntilMonthIdx = toMonthIndex(calendar) + LISTING_WINDOW_MONTHS`
- Clears stale offers for that subsidiary id

### `advanceHoldingSales`

1. Drop offers with `expiresMonthIdx < currentIdx`
2. Clear listing + offers when `currentIdx > listedUntilMonthIdx`
3. Spawn: first listing month always; second month 50%; else 55%
4. Price from `estimateSubsidiaryValue` × random band `[OFFER_PRICE_MIN, OFFER_PRICE_MAX]`
5. `expiresMonthIdx = currentIdx + 1`

### `acceptSaleOffer`

- Cash += price; `ytd.capitalGains += price - purchasePrice`
- Remove subsidiary and all offers for that id
- Italian log when plusvalenza > 0

### `rejectSaleOffer`

- Removes offer only

## Self-Review

| Check | Status |
|-------|--------|
| CAPEX blocked while listed (pre-existing guard) | OK |
| `capitalGains` set on accept only (FY formula deferred Task 5) | OK |
| UI not touched | OK |
| `advanceHoldingSales` wired in `advanceMonth` | OK |

## Concerns

- **Listing window length** — `LISTING_WINDOW_MONTHS = 2` yields up to 3 calendar months where `currentIdx <= listedUntilMonthIdx`; spawn rules only special-case first two derived months.
- **No log on accept when gain ≤ 0** — per brief; sale still settles cash/sub removal.
- **`advanceHoldingSales` shares `rand` with subsidiary month** — same RNG stream as integration risk; acceptable for v1.

## Out of Scope (Task 5+)

- IRES FY formula including `capitalGains` at December close
- UI wiring for list/accept/reject

---

## Bugfix: listing clear must not drop valid offers

**Date:** 2026-08-07  
**Commit:** `1dffa55`  
**Issue:** Task 4 review — `advanceHoldingSales` removed all offers for a subsidiary when clearing an expired listing, even offers with `expiresMonthIdx >= currentIdx`. Offers spawned on the final listing month vanished before accept.

**Fix:** On listing expiry, clear `listedUntilMonthIdx` only; rely on the existing `expiresMonthIdx < currentIdx` filter for offer removal.

**Tests added** (`phase-holding.test.ts`):
- list → first listing month spawns offer
- offer from final listing month survives until `expiresMonthIdx`
- `rejectSaleOffer` removes one offer

**Verification:**

```
npx vitest run src/sim/phase-holding.test.ts
 Test Files  1 passed (1)
      Tests  9 passed (9)

npm run lint ; npm test ; npm run build
 Test Files  38 passed (38)
      Tests  218 passed (218)
 Exit code 0
```
