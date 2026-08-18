# Sim loop

## Player month

1. Act on the market board (accept sales/supply ops, contracts, staff, investments, holding).
2. Press **Chiudi il mese** → `advanceMonth(state)`.
3. Cash moves for due invoices/liabilities; payroll, rent, pressures, world events, fiscal ticks run.
4. New board / offers for the next month.

Win/survive framing: campaign length via `CAMPAIGN_WIN_MONTHS`; **12 consecutive months with cash &lt; 0** → lose (`LOSE_MONTHS_BELOW_ZERO`, toast “12 mesi in rosso”). Fiscal insolvency uses `loseReason: "fiscal"` instead.

## Cash ≠ accounting profit

Invoices settle on terms (PA pays late). Accepting work books future cash, not instant liquidity. YTD P&amp;L feeds IRES/IRAP; it is not the bank balance.

## Shocks

Forced mid/late shocks live in `src/sim/eventCatalog.ts` (`forcedShock*` / `runWorldEvents`). Pool is large (`forcedShockCount() ≥ 18`). Tagged shocks belong to families (ambiente / burocrazia / logistica) with 1–2 month **weight chains** (not a second hit the same close). Cartella is family burocratica but still opens only from overdue F24.

`comfortLevel(state)` rises with **cash** (not treasury parking). Higher comfort increases chance of an immediate shock roll — parking cash in treasury can lower shock pressure by reducing cash comfort.

### Supply shocks + stockout (#6)

Fire / flood / van theft / truck / supplier bust go through `applySupplyShock`. If `supplyMonths === 0` at trigger, cash also takes  
`stockoutExtra = max(800 × lostMonths, round(cash × 0.06 × lostMonths))`  
(on top of the event’s base hit). With stock, consume months + base only. Supplier bust already at zero uses `lostMonths = 2` for the premium.

## Negative cash after shock

`coverNegativeCashFromTreasury` pulls from `game.treasury` when cash goes below zero due to shock resolution (bailout path is shock-oriented; see `phase-shocks.test.ts`).

## Reputation (commercial)

Three layers. **Local** `company.reputation` (0–100) still feeds `src/sim/reputation.ts` slot/demand/contract/default multipliers and local ticket size.

**Municipal** (0–100) and **national** (0–20, +1 per 5 municipal) only change how often big PA jobs appear on the board. Points land when the AR **settles**, not when you accept. Default = no points, no extra reputation hit.

Local tickets stay on `maxDealNet`. Municipal 25–40k, terms often 12 months, **any capoluogo in the company region**. National 50–150k, 24–36 months, **capoluogo in another region**. Titles use the ISTAT city **label**, never the 6-digit code. Every 5 local settlements also +1 municipal (bootstrap). Board filter: Tutte / Locale / Comunale / Nazionale.

Ticket size for local still uses continuous `0.85 + rep/100 × 0.35`. Fiscal **compliance** is separate (bank spread / F24).

## Demand seasons (board)

Each board refresh rolls `demandRegime` (20% secca / 60% normale / 20% boom), independent of staff capacity:

- **Secca:** 0–2 sale offers (× `regimeMult` 0.15 × rep demand mult, then clamp)
- **Normale:** prior feel; board soft-cap 10
- **Boom:** board soft-cap rises to 12

Capacity still limits **accepts**. Contracts use separate RNG. Extreme months show a short in-game popup **only when the regime changes** into secca/boom (`demandPopupForAdvance` — not every repeated secca/boom month).

## Other monthly pieces

- Treasury interest accrues on parked `treasury` (stays in treasury).
- Contracts tick; projects/morale/rival heat/pressures as wired in `advanceMonth`.
- December: annual staff oneri (see [staff-ops.md](staff-ops.md)).
- Load path: `migrateGameState` fills defaults for older saves (`src/sim/migrateGameState.ts`).

## Rival / pressione

`rival.heat` (0–100) is shown as **Pressione rivale** with bands Calma / Tesa / Guerra. Steal: none in Calma or months 0–5; up to 1 in Tesa; up to 2 in Guerra. Choice events from heat ≥ 40; campaign costs `max(800, 4% cash)`. After month 18: **contenuto** if pressure stays low, or **ancorato** (floor 55) until two campaign/undercut responses.

Primary code: `src/sim/advanceMonth.ts`, `src/sim/events.ts`, `src/sim/eventCatalog.ts`, `src/sim/rival.ts`.
