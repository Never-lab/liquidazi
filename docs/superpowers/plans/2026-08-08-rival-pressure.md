# Rival pressure pass — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the local rival a clear mid-game threat: Pressione rivale bands in UI, stronger steal/events by band, softer early months, and contain-vs-anchor payoff after month 18.

**Architecture:** Pure helpers in `rival.ts` (`pressureBand`, `rivalPhase`, steal multi, payoff tick). `tickRivalHeat` applies `floor` / `contained`. `eventCatalog` lowers rival-choice threshold, scales campaign cost, biases raid shock, player-facing «pressione» copy. GameHUD chip + tooltip.

**Tech Stack:** TypeScript, Vitest, React. No new npm deps.

**Spec:** `docs/superpowers/specs/2026-08-08-rival-pressure-design.md`

## Global Constraints

- Persist field stays `rival.heat` (0–100); UI says **Pressione rivale** / Calma·Tesa·Guerra
- Bands: Calma 0–39, Tesa 40–69, Guerra 70–100
- Steal: Calma 0; Tesa max 1; Guerra max 2 (phase Arrivo softens)
- Phases by `monthsPlayed`: Arrivo 0–5, Caldo 6–17, Resa ≥18
- Rival choice from heat ≥ **40**; campaign `max(800, round(cash*0.04))`
- No `rival_poach`; no second meter; no quarterly score
- Branch: `feat/rival-pressure`
- `npm test` green; Italian UI

## File map

| File | Role |
|------|------|
| `src/sim/types.ts` | Extend `Rival` |
| `src/sim/rival.ts` | Bands, phase, steal, heat tick + floor, payoff |
| `src/sim/eventCatalog.ts` | Threshold, cost, copy, raid bias |
| `src/sim/advanceMonth.ts` | Call `tickRivalPayoff` after heat tick |
| `src/screens/GameHUD.tsx` | Chip + tooltip |
| `src/sim/phase-rival-pressure.test.ts` | New focused tests |
| `src/sim/phase-loop-pressure.test.ts` / `phase-enjoy.test.ts` | Update legacy asserts |
| `docs/wiki/sim-loop.md`, help if needed, `ROADMAP.md` | Docs |

---

### Task 1: Types + band/phase helpers (TDD)

**Files:**
- Modify: `src/sim/types.ts`
- Modify: `src/sim/rival.ts`
- Create: `src/sim/phase-rival-pressure.test.ts`

**Interfaces:**
- Extends `Rival`:
```ts
export interface Rival {
  name: string;
  heat: number;
  contained?: boolean;
  floor?: number;
  /** Serious rival responses toward clearing an anchor (0–2). */
  anchorClears?: number;
}
```
- Produces:
  - `export type PressureBand = "calma" | "tesa" | "guerra"`
  - `export type RivalPhase = "arrivo" | "caldo" | "resa"`
  - `export const pressureBand = (heat: number): PressureBand`
  - `export const rivalPhase = (monthsPlayed: number): RivalPhase` — `<6` arrivo, `<18` caldo, else resa
  - `export const pressureBandLabel = (band: PressureBand): string` — `"Calma" | "Tesa" | "Guerra"`
  - `export const RIVAL_PRESSURE_TOOLTIP` constant (Italian string from spec)

- [ ] **Step 1: Extend `Rival` in types.ts**

- [ ] **Step 2: Failing tests**

```ts
import { describe, expect, it } from "vitest";
import {
  pressureBand,
  pressureBandLabel,
  rivalPhase,
} from "./rival";

describe("rival pressure helpers", () => {
  it("pressureBand thresholds", () => {
    expect(pressureBand(0)).toBe("calma");
    expect(pressureBand(39)).toBe("calma");
    expect(pressureBand(40)).toBe("tesa");
    expect(pressureBand(69)).toBe("tesa");
    expect(pressureBand(70)).toBe("guerra");
    expect(pressureBand(100)).toBe("guerra");
  });

  it("rivalPhase by monthsPlayed", () => {
    expect(rivalPhase(0)).toBe("arrivo");
    expect(rivalPhase(5)).toBe("arrivo");
    expect(rivalPhase(6)).toBe("caldo");
    expect(rivalPhase(17)).toBe("caldo");
    expect(rivalPhase(18)).toBe("resa");
  });

  it("labels Italian", () => {
    expect(pressureBandLabel("calma")).toBe("Calma");
    expect(pressureBandLabel("tesa")).toBe("Tesa");
    expect(pressureBandLabel("guerra")).toBe("Guerra");
  });
});
```

- [ ] **Step 3: Run** `npx vitest run src/sim/phase-rival-pressure.test.ts` — expect FAIL

- [ ] **Step 4: Implement helpers** in `rival.ts` (no steal rewrite yet)

- [ ] **Step 5: Run** — expect PASS; commit

```bash
git add src/sim/types.ts src/sim/rival.ts src/sim/phase-rival-pressure.test.ts
git commit -m "feat: rival pressure band and phase helpers"
```

---

### Task 2: Steal 1–2 + phase soft Arrivo + copy

**Files:**
- Modify: `src/sim/rival.ts` (`applyRivalSteal`, log text)
- Modify: `src/sim/phase-rival-pressure.test.ts`
- Modify: `src/sim/phase-loop-pressure.test.ts` if asserts break

**Interfaces:**
- Rewrite `applyRivalSteal`:
  - If `quietMode` or no rival or `contained` → no-op
  - Effective band: if `rivalPhase === "arrivo"` treat steal as **calma** (no steal) **or** roll with chance ×0.35 only in tesa+ — **locked: Arrivo = no board steal**
  - Calma / heat &lt; 40: no steal
  - Tesa: try up to **1** steal; chance `0.25 + (heat-40)/150`
  - Guerra: try up to **2** steals; each steal independent chance `0.45 + (heat-70)/100` capped ~0.7; stop if no sales left
  - Each steal: +2 heat (then apply floor if any), log with **pressione** not heat
- `tickRivalHeat`: after adjusting heat, if `floor != null && !contained` then `heat = max(heat, floor)`; if `contained` skip upward drift from zero-sales? **locked:** contained → clamp heat rises to max +1/month and **no steal** already; still allow Responsabile to lower

- [ ] **Step 1: Tests**

```ts
it("Calma does not steal", () => {
  let s = createInitialGameState();
  s.quietMode = false;
  s.monthsPlayed = 10; // caldo
  s.rival = { name: "X", heat: 30 };
  s.opportunities = [/* one sale */];
  expect(applyRivalSteal(s).opportunities.filter(o => o.kind==="sale")).toHaveLength(1);
});

it("Guerra can steal two sales across retries", () => {
  // heat 95, monthsPlayed 10, two sales + supply; loop monthsPlayed seeds until ≥2 sales removed on a single call
  // OR unit-test a helper stealOnce if you extract it
});

it("Arrivo never steals even at high heat", () => {
  s.monthsPlayed = 3;
  s.rival = { name: "X", heat: 90 };
  // expect sales intact after applyRivalSteal
});
```

Use concrete Opportunity objects like existing `phase-loop-pressure` test.

- [ ] **Step 2: Implement** `applyRivalSteal` + update log strings to `pressione`

- [ ] **Step 3: Update** legacy test that looks for `heat` in steal log → `pressione`

- [ ] **Step 4: Commit** `feat: banded rival steal with soft early phase`

---

### Task 3: Events, HUD, campaign cost

**Files:**
- Modify: `src/sim/eventCatalog.ts`
- Modify: `src/screens/GameHUD.tsx`
- Modify: `src/sim/phase-enjoy.test.ts` (threshold / copy)
- Modify: `src/sim/phase-rival-pressure.test.ts` for campaign cost helper if extracted

**Interfaces:**
- `export const rivalCampaignCost = (cash: number): number => Math.max(800, Math.round(cash * 0.04))`
- `runWorldEvents` rival branch: `heat >= 40` (was 55); chance `0.25 + (heat-40)/120` (higher in guerra)
- `rival_push` options: campaign uses `rivalCampaignCost(s.company.cash)`; bodies/logs say pressione
- `tryQueueShock`: if `rival && heat >= 70 && rand() < 0.35`, pick `shock_rival_raid` instead of uniform pool index (else existing)
- Shock raid label/log: pressione not heat
- GameHUD chip:
```tsx
const band = pressureBand(game.rival.heat);
const label = game.rival.contained
  ? `${game.rival.name} · Contenuto`
  : band === "calma"
    ? `${game.rival.name} · ${pressureBandLabel(band)}`
    : `${game.rival.name} · ${pressureBandLabel(band)} · ${Math.round(game.rival.heat)}`;
// title={RIVAL_PRESSURE_TOOLTIP}
```

- [ ] **Step 1: Test** `rivalCampaignCost(10000)===800`, `rivalCampaignCost(50000)===2000`; event test heat 45 can roll rival_push (loop months)

- [ ] **Step 2: Implement** catalog + HUD

- [ ] **Step 3: Commit** `feat: rival events threshold, scaled campaign, HUD bands`

---

### Task 4: Payoff (contain / anchor) + docs

**Files:**
- Modify: `src/sim/rival.ts` — `tickRivalPayoff`
- Modify: `src/sim/advanceMonth.ts` — call after `tickRivalHeat` (+ Responsabile)
- Modify: `src/sim/eventCatalog.ts` — campaign/undercut increment `anchorClears` when `floor` set
- Modify: docs + ROADMAP
- Tests in `phase-rival-pressure.test.ts`

**Interfaces:**
```ts
export const tickRivalPayoff = (state: GameState): GameState => {
  // if !rival or monthsPlayed < 18 return state
  // if contained return state
  // if heat < 40 && !floor: set contained=true, clear floor/anchorClears, pushLog good
  // else if heat >= 70 && floor == null && !contained: set floor=55, anchorClears=0, pushLog bad
  // apply floor clamp
}
```

On `rival_push` campaign/undercut when `rival.floor != null`:
`anchorClears = (anchorClears??0)+1`; if `>=2` clear `floor` and `anchorClears`.

Ignore does not increment.

- [ ] **Step 1: Tests**

```ts
it("contain at month 18 when heat low", () => {
  s.monthsPlayed = 18;
  s.rival = { name: "X", heat: 30 };
  s = tickRivalPayoff(s);
  expect(s.rival?.contained).toBe(true);
});

it("anchor floor at month 18 when heat high", () => {
  s.monthsPlayed = 18;
  s.rival = { name: "X", heat: 80 };
  s = tickRivalPayoff(s);
  expect(s.rival?.floor).toBe(55);
  s = tickRivalHeat(s, 10, 10); // would lower heat
  expect(s.rival!.heat).toBeGreaterThanOrEqual(55);
});
```

- [ ] **Step 2: Implement** payoff + wire advanceMonth + event clears

- [ ] **Step 3: Wiki** — short «Rival / pressione» under sim-loop; ROADMAP Done row + Next if needed

- [ ] **Step 4: Verify** `npm run lint && npm test && npm run build`

- [ ] **Step 5: Commit** `feat: rival contain/anchor payoff and docs`

---

## Spec coverage

| Spec item | Task |
|-----------|------|
| Bands + tooltip + labels | 1, 3 |
| Steal 0/1/2 + Arrivo soft | 2 |
| Events ≥40, campaign scale, raid bias, copy | 3 |
| HUD chip | 3 |
| Phases + contain/anchor | 2, 4 |
| Docs / ROADMAP | 4 |
| No rival_poach / second meter | — |
