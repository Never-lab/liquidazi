# Rival pressure pass — Design

**Date:** 2026-08-08  
**Branch:** `feat/rival-pressure`  
**Status:** Approved for implementation  
**Goal:** Make the local rival a real mid-game threat in singleplayer: clearer “pressione” UX, stronger board pressure + narrative choices, and a late-game contain-or-anchor payoff.

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Role | Mix **market pressure (A)** + **narrative choices (C)** — no quarterly score race |
| Intensity | **Aggressive** mid-game threat |
| Arc | Escalation phases by `monthsPlayed` with clear payoff |
| Meter | Keep `rival.heat` 0–100 internally; UI = **Pressione rivale** with Calma / Tesa / Guerra |
| Approach | Single meter + banded steal/events + phase modifiers (approach 1) |
| Deferred | `rival_poach` event, market-share second meter, multiplayer |

## Pressure bands (UI)

| Band | `heat` | Chip |
|------|--------|------|
| Calma | 0–39 | `{nome} · Calma` |
| Tesa | 40–69 | `{nome} · Tesa · {n}` |
| Guerra | 70–100 | `{nome} · Guerra · {n}` |

Tooltip (always):

> Pressione rivale: sale se prendi poche commesse o le lasci scadere; scende se riempi la capacità e con Responsabile / campagne. In Guerra ruba più lead e forza eventi.

Player-facing copy prefers **pressione** over opaque «heat» (logs/events/shock labels).

### What moves pressure (didactic)

**Raises:** few accepts vs capacity, decline/expire sale (+2 today), successful steal, ignore rival choice.  
**Lowers:** accepts ≥ half capacity (−4), each Responsabile (−1/month after heat tick), campaign / undercut options on rival events.

## Board steal (market pressure)

On each `refreshMarketBoard` / `applyRivalSteal` (skip `quietMode`):

| Band | Max sales stolen | Chance (guideline) |
|------|------------------|--------------------|
| Calma | 0 | — |
| Tesa | 1 | higher than legacy (~0.25–0.45 by heat) |
| Guerra | **2** | high (~0.45–0.70 by heat) |

Log each steal: `{nome} ha preso «…» (pressione {n})`.

Phase modifiers (below) can soft-gate early steal.

## Narrative + shocks

- Rival choice threshold: **heat ≥ 40** (was 55); prefer `rival_push` over generic pool when rolled.
- Rival choice chance scales up in Guerra (~0.35–0.55).
- `rival_push` campaign cost: `max(800, round(cash * 0.04))` (scales late-game).
- Copy: titles/bodies/options say **pressione**, not heat.
- `shock_rival_raid`: keep −3 sales / +20 pressure; bias toward this shock when heat ≥ 70 (or raise weight in forced shock path). Copy uses pressione.

No new `rival_poach` in this slice.

## Escalation phases

Based on `monthsPlayed`:

| Phase | Months | Behavior |
|-------|--------|----------|
| Arrivo | 0–5 | Steal rare/soft (treat as Calma for steal, or ×0.35 chance); rival events uncommon |
| Caldo | 6–17 | Full Tesa/Guerra rules |
| Resa dei conti | ≥18 | Payoff check |

### Payoff (≥18)

Persist on `Rival` (migrate-safe defaults):

```ts
interface Rival {
  name: string;
  heat: number;
  /** Late-game: rival largely contained */
  contained?: boolean;
  /** Minimum heat while anchored (ignored if contained) */
  floor?: number;
}
```

**Contained** (once, when `monthsPlayed >= 18` and not already decided badly): if current heat **&lt; 40** (and optionally never sat in Guerra for the last 6 months if cheap to track — else heat-only is enough): set `contained = true`, `floor = undefined`, toast/log positive; steal almost off; chip suffix «· Contenuto».

**Anchored** (if at months ≥18 heat **≥ 70** and not contained): set `floor = 55`; each month `heat = max(heat, floor)` until player resolves **two** serious rival responses (campaign or undercut counts; ignore does not). Then clear `floor`. Track with `rival.anchorClears?: number` (0→2) or a small counter on `Rival`.

Clamp heat with floor when present: `heat = min(100, max(floor ?? 0, heat))`.

## Non-goals

- Quarterly “who won the district” score
- Second meter / market share sim
- Multiplayer or AI rival P&amp;L
- `rival_poach` choice event
- Renaming the persisted field `heat` (UI only)

## Files

- `src/sim/rival.ts` — bands helpers, steal 1–2, phase gates, payoff tick
- `src/sim/types.ts` — `Rival` optional fields
- `src/sim/eventCatalog.ts` — thresholds, campaign cost, copy, raid bias
- `src/sim/advanceMonth.ts` — call payoff tick if not inside rival module from heat tick
- `src/screens/GameHUD.tsx` — chip + tooltip
- `docs/wiki/sim-loop.md` / help one-liner, `ROADMAP.md`
- Tests: extend `phase-loop-pressure.test.ts` / `phase-enjoy.test.ts`

## Done when

- Chip shows Calma / Tesa / Guerra (and Contenuto when earned) with explanatory tooltip
- Guerra can steal up to 2 sales; events fire from Tesa+
- Months 0–5 feel softer; 6–17 aggressive; ≥18 contain vs anchor
- Player-facing copy uses pressione
- `npm run lint && npm test && npm run build` green
