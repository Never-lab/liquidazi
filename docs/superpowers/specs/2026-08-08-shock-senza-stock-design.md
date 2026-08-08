# Shock senza stock (#6) — Design

**Date:** 2026-08-08  
**Status:** Approved for implementation  
**Goal:** When a supply-touching shock fires at `supplyMonths === 0`, cash damage is no longer a soft flat; player pays a stockout premium (urgent repurchase / downtime).

## Scope

In scope:
- Shared helper for supply shocks with stockout premium
- Wire: `shock_fire`, `shock_flood`, `shock_van_theft`, `shock_truck`, `shock_supplier_bust`
- Log / option copy when stockout path applies
- Tests + ROADMAP Done / Next update

Out of scope:
- Non-supply shocks (quake, cyber, tax, etc.)
- Changing emergency supply pricing
- New event types

## Formula (locked)

Helper idea: `applySupplyShock(state, { lostMonths, baseCash?, basePct?, baseFloor? })`

1. `before = supplyMonths`
2. Consume: `supplyMonths = max(0, before - lostMonths)` (supplier bust: force `0`)
3. Base cash hit as today (flat and/or `shockCash(pct, floor)`)
4. **If `before === 0`:**  
   `extra = max(800 × lostMonths, round(cashBefore × 0.06 × lostMonths))`  
   charge `extra` to cash + `ytd.otherCosts`  
   (`lostMonths` for supplier bust stockout path = **2**)
5. Log mentions stockout / riconversione when `extra > 0`

With stock (`before > 0`): current behavior only (consume + base).

## Events

| id | lostMonths | base today |
|----|------------|------------|
| `shock_fire` | 2 | −500 flat |
| `shock_flood` | 1 | 12% / floor 800 |
| `shock_van_theft` | 1 | 5% / floor 650 |
| `shock_truck` | 2 | −1100 flat |
| `shock_supplier_bust` | →0; stockout `lost=2` | −700 flat |

## Done when

- Stockout fire/truck costs base + `max(1600, 12% cash)`-style extra; with stock, base + consume only
- Supplier already at 0 pays −700 + extra(lost=2)
- `npm run lint && npm test && npm run build`
- ROADMAP: #6 shipped; Next #1 no longer “resto #6”
