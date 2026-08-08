# Supply / scorte pass (#3) — Design

**Date:** 2026-08-08  
**Branch:** `feat/supply-scorte`  
**Status:** Approved for implementation  
**Goal:** Make board supplies worth buying vs a cheap emergency restock, and make months-gained from each supply offer obvious in the UI.

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Scope | Both: scaled emergency **and** contract-side stock value (option C) |
| Approach | Continuous emergency cost + contract +8% + clearer supply cards (approach 1) |
| Emergency rate | **10% of cash**, floor **1 500 €** |
| Contract bonus | +8% `netPerMonth` only when accepting with `supplyMonths > 0` |
| One-shot sales | No +8%; keep empty-stock ticket ×0.72 |
| Board months | Unchanged rule: `net ≥ 1200 → +2`, else `+1` — **shown on card** |

## Formulas

```ts
emergencySupplyNet(state) = Math.max(1500, Math.round(state.company.cash * 0.10))
supplyMonthsFromNet(net) = net >= 1200 ? 2 : 1
```

- `orderEmergencySupply`: charge `emergencySupplyNet(state)`, +2 months, only if `supplyMonths === 0`.
- `acceptAsContract`: if `supplyMonths > 0`, `netPerMonth = round2(op.net / months * 1.08)`.
- AR default roll: existing chain × `(supplyMonths > 0 ? 0.85 : 1)` (empty stock still has the existing ×1.45 boost).

Examples: cash 10 000 → emergency 1 500 (floor); cash 50 000 → **5 000**.

## UI

- Supply deal meta: `Uscita · {net} + IVA · +{N} mesi scorte`.
- Optionally bake `· +N mesi` into `pushSupply` title for log clarity.
- Emergency button: live `formatCash(emergencySupplyNet(game))`.
- Scorte chip tooltip: months left + «contratti +8% netto · meno insoluti se > 0».
- Store toast for emergency uses computed net, not a fixed 750.

## Non-goals

- Consuming supply on contract accept
- Demand boom/secca (#2)
- Changing the 6-month supply cap
- Reworking one-shot sale payouts beyond empty-stock ticket/default

## Files

- `src/sim/events.ts` — helpers, emergency, accept/log/supply titles
- `src/sim/contracts.ts` — +8% on accept
- `src/sim/advanceMonth.ts` — default ×0.85 with stock
- `src/components/OpportunitiesPanel.tsx` — card + button + chip
- `src/store/gameStore.ts` — toast copy if hardcoded
- `src/sim/phase-supply-emergency.test.ts` (+ contract/default cases)
- `docs/wiki/help/finanza.md`, `ROADMAP.md` #3

## Done when

- Emergency cost scales (floor 1500, ~5k at 50k cash)
- Board supplies show +1 / +2 months clearly
- Contracts with stock get +8% net; defaults slightly better with stock
- Tests + `npm run lint && npm test && npm run build` green
