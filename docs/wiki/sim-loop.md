# Sim loop

## Player month

1. Act on the market board (accept sales/supply ops, contracts, staff, investments, holding).
2. Press **Chiudi il mese** → `advanceMonth(state)`.
3. Cash moves for due invoices/liabilities; payroll, rent, pressures, world events, fiscal ticks run.
4. New board / offers for the next month.

Win/survive framing: campaign length via `CAMPAIGN_WIN_MONTHS`; **12 consecutive months with cash &lt; 0** → lose (`LOSE_MONTHS_BELOW_ZERO`). Cash loss sets `loseReason: "cash"` when applicable.

## Cash ≠ accounting profit

Invoices settle on terms (PA pays late). Accepting work books future cash, not instant liquidity. YTD P&amp;L feeds IRES/IRAP; it is not the bank balance.

## Shocks

Forced mid/late shocks live in `src/sim/eventCatalog.ts` (`forcedShock*` / `runWorldEvents`). Balance pass: shocks apply in the open-month path; pool is large (`forcedShockCount() ≥ 18`).

`comfortLevel(state)` rises with **cash** (not treasury parking). Higher comfort increases chance of an immediate shock roll — parking cash in treasury can lower shock pressure by reducing cash comfort.

## Negative cash after shock

`coverNegativeCashFromTreasury` pulls from `game.treasury` when cash goes below zero due to shock resolution (bailout path is shock-oriented; see `phase-shocks.test.ts`).

## Other monthly pieces

- Treasury interest accrues on parked `treasury` (stays in treasury).
- Contracts tick; projects/morale/rival heat/pressures as wired in `advanceMonth`.
- December: annual staff oneri (see [staff-ops.md](staff-ops.md)).

Primary code: `src/sim/advanceMonth.ts`, `src/sim/events.ts`, `src/sim/eventCatalog.ts`.
