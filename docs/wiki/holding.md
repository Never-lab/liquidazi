# Holding (flip / acquisizioni)

Shipped holding loop: buy subsidiaries, drip EBITDA, improve, list/sell (flip), capital gains into year-end IRES. Code: `src/sim/acquisitions.ts`, UI under Crescita / Holding. Tests: `phase-holding.test.ts`, `phase-invest-acq.test.ts`, `migrateHolding.ts`.

## Loop (as shipped)

1. Acquisition board refreshes on a cadence (every 3 months) → **Acquista** (cash out, consumes a slot).
2. Each month: EBITDA drip → cash + YTD revenue; slow drift; integration risk.
3. **CAPEX**: spend cash to boost EBITDA (cooldown).
4. **Metti in vendita** → auction-lite offers over 1–2 months; accept → cash in.
5. `gain = max(0, salePrice − purchasePrice)` accumulates as YTD capital gains → IRES at FY close (not a spot F24). Losses do not refund cash for tax base (net gains floored at 0 for tax).

## Slots

`holdingSlotCap` scales (base **4**, max **8**) via milestones/upgrades — not a forever-3 lite portfolio.

## Non-goals (still true)

No full second SRL books, no PEX, no consolidated group tax. Educational disclaimer applies.

For exact numeric tables, prefer `phase-holding` tests over inventing values here.
