# Demand boom / secca (#2) — Design

**Date:** 2026-08-08  
**Branch:** `feat/demand-boom-secca`  
**Status:** Approved for implementation  
**Goal:** Separate board **demand** (how many sale offers spawn) from **capacity** (how many you can accept), so months swing between dry boards (0–2 sales) and boom boards (up to 12), with a short animated popup on extreme months.

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Intensity | Secca **0–2** sale rows; boom raises **boardCap to 12** (sale+supply together); contracts keep own RNG |
| Regime pick | Pure independent RNG each month — **20% secca / 60% normale / 20% boom** |
| Player feedback | Dedicated **popup** (fade + scale-in), not a persistent chip; silent on `normale` |
| Reputation | Regime × `repDemandMult` (secca can rise a bit with high rep; boom thinner with low rep) |
| Approach | Discrete regimes + multipliers + band clamps (approach 1) |

## Formulas

```ts
type DemandRegime = "secca" | "normale" | "boom";

// Independent roll each generateOpportunities / refreshMarketBoard
// weights: secca 0.20, normale 0.60, boom 0.20

regimeMult = { secca: 0.15, normale: 1.0, boom: 1.35 }

base = capacity + jitter + commercialeBonus + impiegati
// jitter unchanged: floor(rand()*3)-1

raw = round(base * regimeMult[regime] * repDemandMult(reputation))

saleTarget =
  regime === "secca"   ? clamp(raw, 0, 2)
: regime === "boom"    ? clamp(raw, 1, 12)
: /* normale */          Math.max(1, raw)

boardCap = regime === "boom" ? 12 : BOARD_MAX_OPS // 10
```

- After `saleTarget`, compute `supplyTarget` as today; then scale `sale + supply` down into `boardCap` (same shape as today’s `BOARD_MAX_OPS` scale). In boom, sales alone never force the board above 12 once scaled.
- Write `state.demandRegime` inside `generateOpportunities` / `refreshMarketBoard` (also on new-game seed).
- Soft-lock scorte: if `supplyMonths <= 0`, still force at least one supply offer even in secca with 0 sales.
- **Accept path unchanged:** `salesAcceptedThisMonth >= monthlyCapacity` → ephemeral toast (not inbox).
- **Contracts:** `maybeMakeContract` / contract spawn RNG stays independent of `demandRegime`.

Persist `GameState.demandRegime` (default `"normale"` via migrate `??=`).

## UI

- After month close / board refresh, if `demandRegime` is `secca` or `boom`, set a one-shot store flag (e.g. `demandPopup`) and show `DemandPopup`.
- Copy (Italian):
  - Secca — title «Mercato in secca»; body «Poche commesse in vendita questo mese.»
  - Boom — title «Picco di domanda»; body «Tabellone più pieno — attenzione alla capacità.»
- Dismiss: click/tap or auto ~3.5s. Animation: fade + slight scale-in (match existing motion language; no purple/glow).
- Not `pendingEvent`; does not block month close; does not write to inbox/`game.log`.
- `normale`: no popup.

## Non-goals

- Balance backlog **#6** (shock without stock)
- Seasonal calendar or Markov regime chaining
- Putting demand alerts in the mail inbox
- Tutorial rewrite (wiki one-liner OK)
- Changing how capacity gates accepts

## Files

- `src/sim/types.ts` — `DemandRegime`, `demandRegime` on `GameState`
- `src/sim/events.ts` — roll + clamp + boom board cap in `generateOpportunities`
- `src/store/gameStore.ts` — open/clear `demandPopup` on advance
- `src/components/DemandPopup.tsx` (+ CSS module)
- `src/App.tsx` or `GameHUD.tsx` — mount host
- Tests: extend board generation coverage (new or existing phase test)
- `docs/wiki/sim-loop.md`, `ROADMAP.md` (#2 → shipped)

## Done when

- Secca months yield **0–2** sale rows on the board
- Boom months: `boardCap === 12` so sale+supply can fill up to **12** cards that month
- Normale ≈ current feel (rep still scales demand)
- Popup only for secca/boom, animated, dismissible, not in inbox
- Contracts still spawn on their own RNG
- `npm run lint && npm test && npm run build` green
