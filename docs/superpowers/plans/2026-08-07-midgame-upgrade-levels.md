# Midgame Progression Slice 1 — Upgrade Levels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the four one-shot company upgrades into Lv1→Lv2→Lv3 so Crescita stays useful after year 3.

**Architecture:** Store `upgradeLevels: Partial<Record<UpgradeId, 0|1|2|3>>` on `GameState`; migrate legacy `upgrades: UpgradeId[]` on load. Effect helpers read level; `buyUpgrade` purchases or levels up. UI shows Lv n/3 and next cost.

**Tech Stack:** TypeScript, Vitest, React, Zustand. No new npm deps.

**Spec:** `docs/superpowers/specs/2026-08-07-midgame-progression-design.md` (Slice 1 only — do not implement annual projects or living staff)

## Global Constraints

- Slice 1 only (no annual projects, no morale/turnover)
- No new npm dependencies
- Italian UI copy
- Legacy saves: owned upgrade ids → level 1
- `npm test` green
- Keep Investimenti / tesoreria / subsidiaries unchanged

## File map

| File | Role |
|------|------|
| `src/config/upgrades.ts` | Level defs, costs, blurbs, `upgradeLevel` / `hasUpgrade` |
| `src/sim/types.ts` | `upgradeLevels` on state; keep optional legacy `upgrades?` for migrate |
| `src/sim/migrateUpgrades.ts` | Pure migrate helper (legacy array → levels) |
| `src/sim/actions.ts` | `upgradeCost` next level; `buyUpgrade` level-up + sede factors |
| `src/sim/events.ts` | Processi/commerciale scale by level |
| `src/sim/advanceMonth.ts` | Processi payroll discount + F24 Lv3 compliance bump |
| `src/components/UpgradesPanel.tsx` | Lv UI |
| `src/ui/coach.ts` | Tip when no levels bought |
| `src/store/gameStore.ts` | Toast / owned check via levels; migrate on hydrate/load if needed |
| Tests | `src/config/upgrades.test.ts`, extend `phase-staff-upgrades.test.ts`, migrate tests |
| `ROADMAP.md` | Done Slice 1; Next Slice 2–3 |

---

### Task 1: Config helpers + migrate

**Files:**
- Modify: `src/config/upgrades.ts`
- Create: `src/sim/migrateUpgrades.ts`
- Create: `src/config/upgrades.test.ts`
- Create: `src/sim/migrateUpgrades.test.ts`
- Modify: `src/sim/types.ts` (add `upgradeLevels`; keep `upgrades?: UpgradeId[]` optional for old JSON)

**Interfaces:**
- Produces:
  - `export type UpgradeLevel = 0 | 1 | 2 | 3`
  - `export type UpgradeLevels = Partial<Record<UpgradeId, UpgradeLevel>>`
  - `upgradeLevel(levels: UpgradeLevels | undefined, id: UpgradeId): UpgradeLevel`
  - `hasUpgrade(levels: UpgradeLevels | undefined, id: UpgradeId): boolean` — `upgradeLevel(...) >= 1`
  - `nextUpgradeLevel(levels, id): UpgradeLevel | null` — null if already 3
  - `UPGRADE_LEVELS: Record<UpgradeId, { costMult: number; blurb: string }[]>` indexed 0=Lv1, 1=Lv2, 2=Lv3 (or explicit `1|2|3` keys)
  - `migrateUpgradeState(game: Pick<GameState, "upgrades" | "upgradeLevels">): UpgradeLevels`
  - Base costs stay on `UPGRADES[id].cost`; next cost = `round(base * costMult[level])` (sede special-cased in actions)

**Level table (use these exact numbers):**

| Id | Lv1 costMult / effect | Lv2 | Lv3 |
|----|----------------------|-----|-----|
| `gestionale_f24` | 1.0 / auto F24 | 1.7 / auto F24 | 2.6 / auto F24 + `compliance = min(100, compliance+2)` when auto-pays |
| `commerciale` | 1.0 / +1 board, ticket×1.08, ceiling+4000 | 1.8 / +2 board, ×1.12, +6000 | 2.8 / +3 board, ×1.16, +8000 |
| `sede` | 1.0 / rent factor 0.85 vs **base** | 1.8 / factor 0.78 | 2.6 / factor 0.72 |
| `processi` | 1.0 / +1 slot, payroll ×0.95 | 1.8 / +2, ×0.93 | 2.6 / +3, ×0.90 |

Sede Lv1 cost remains `max(def.cost, rentBase*6)`. Store `company.monthlyRentBase` on first sede purchase if missing (`monthlyRentBase ??= monthlyRent` before applying factor). Higher sede levels: set `monthlyRent = round2(monthlyRentBase * factor(level))` (not compound multiply).

- [ ] **Step 1: Failing tests for helpers + migrate**

`src/config/upgrades.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  hasUpgrade,
  upgradeLevel,
  nextUpgradeLevel,
  type UpgradeLevels,
} from "./upgrades";

describe("upgrade levels helpers", () => {
  it("defaults to 0; hasUpgrade false", () => {
    expect(upgradeLevel(undefined, "processi")).toBe(0);
    expect(hasUpgrade(undefined, "processi")).toBe(false);
  });

  it("reads level and next", () => {
    const levels: UpgradeLevels = { processi: 2 };
    expect(upgradeLevel(levels, "processi")).toBe(2);
    expect(hasUpgrade(levels, "processi")).toBe(true);
    expect(nextUpgradeLevel(levels, "processi")).toBe(3);
    expect(nextUpgradeLevel({ processi: 3 }, "processi")).toBeNull();
  });
});
```

`src/sim/migrateUpgrades.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { migrateUpgradeState } from "./migrateUpgrades";

describe("migrateUpgradeState", () => {
  it("maps legacy upgrades[] to level 1", () => {
    expect(
      migrateUpgradeState({ upgrades: ["processi", "sede"], upgradeLevels: undefined }),
    ).toEqual({ processi: 1, sede: 1 });
  });

  it("prefers existing upgradeLevels", () => {
    expect(
      migrateUpgradeState({
        upgrades: ["processi"],
        upgradeLevels: { processi: 3 },
      }),
    ).toEqual({ processi: 3 });
  });

  it("empty legacy → empty levels", () => {
    expect(migrateUpgradeState({ upgrades: [], upgradeLevels: undefined })).toEqual({});
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run src/config/upgrades.test.ts src/sim/migrateUpgrades.test.ts`

Expected: FAIL (missing exports / module)

- [ ] **Step 3: Implement config + migrate**

Rewrite `hasUpgrade` to take `UpgradeLevels | undefined` (breaking call sites updated in Task 2).

Add level blurbs Italian in config for UI (Lv1 can reuse current `blurb`).

`migrateUpgradeState`: if `upgradeLevels` has any keys, return a shallow copy of it; else build from `upgrades ?? []` each id → 1.

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run src/config/upgrades.test.ts src/sim/migrateUpgrades.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/config/upgrades.ts src/config/upgrades.test.ts src/sim/migrateUpgrades.ts src/sim/migrateUpgrades.test.ts src/sim/types.ts
git commit -m "feat(upgrades): level helpers and legacy migrate"
```

In `types.ts` this task: add

```ts
upgradeLevels?: Partial<Record<UpgradeId, 0 | 1 | 2 | 3>>;
/** @deprecated legacy saves — migrated to upgradeLevels */
upgrades?: UpgradeId[];
```

Change `upgrades: UpgradeId[]` required field to optional `upgrades?` plus `upgradeLevels?`. Update `createInitialGameState` to set `upgradeLevels: {}` and omit or empty `upgrades: []`.

---

### Task 2: buyUpgrade level-up + sim effect call sites

**Files:**
- Modify: `src/sim/actions.ts` (`upgradeCost`, `buyUpgrade`)
- Modify: `src/sim/events.ts` (processi slots, commerciale board/ticket)
- Modify: `src/sim/advanceMonth.ts` (payroll discount, F24 auto + Lv3 compliance)
- Modify: `src/sim/types.ts` (`company.monthlyRentBase?: number` if not present)
- Modify: `src/sim/phase-staff-upgrades.test.ts` (+ new level-up cases)
- Modify any other `hasUpgrade(state.upgrades` call sites to `hasUpgrade(state.upgradeLevels` / migrate first)

**Interfaces:**
- Consumes: Task 1 helpers + level table
- Produces:
  - `upgradeCost(state, id)` → cost to reach **next** level (0→1, 1→2, 2→3); if level===3 return current Lv3 display cost or `Infinity` unused
  - `buyUpgrade` increments level by 1 if cash ok; no-op at 3
  - After any game load path used in tests, levels are set (call migrate in `buyUpgrade` start: `next.upgradeLevels = migrateUpgradeState(next)`)

**Effect wiring (exact):**

```ts
// events.ts monthlyCapacity
const procLv = upgradeLevel(state.upgradeLevels, "processi");
const processi = procLv; // +1/+2/+3 slots

// commerciale board bonus in generateOpportunities
const commercialeBonus = upgradeLevel(state.upgradeLevels, "commerciale"); // 0–3

// ticketCeiling bump
const commercialeBump = [0, 4000, 6000, 8000][upgradeLevel(state.upgradeLevels, "commerciale")]!;

// maxDealNet / ticket multiplier
const commercialeMult = [1, 1.08, 1.12, 1.16][upgradeLevel(...)]!;

// advanceMonth payroll
const processiDiscount = [1, 0.95, 0.93, 0.9][upgradeLevel(next.upgradeLevels, "processi")]!;

// gestionale: still if hasUpgrade; if level >= 3 && auto-paid, compliance = min(100, compliance+2)
```

Sede in `buyUpgrade`:

```ts
next.company.monthlyRentBase ??= next.company.monthlyRent;
const factor = [1, 0.85, 0.78, 0.72][newLevel]!;
next.company.monthlyRent = round2(next.company.monthlyRentBase * factor);
```

- [ ] **Step 1: Extend failing tests in `phase-staff-upgrades.test.ts`**

Keep existing tests working but switch assertions:

- `expect(s.upgradeLevels?.gestionale_f24).toBe(1)` instead of `upgrades.toContain`
- Add:

```ts
  it("processi levels stack capacity 1 then 2 then 3", () => {
    let s = createInitialGameState({ city: "058091", sector: "servizi" });
    s.company.cash = 100000;
    const cap0 = monthlyCapacity(s);
    s = buyUpgrade(s, "processi");
    expect(monthlyCapacity(s)).toBe(cap0 + 1);
    s = buyUpgrade(s, "processi");
    expect(monthlyCapacity(s)).toBe(cap0 + 2);
    s = buyUpgrade(s, "processi");
    expect(monthlyCapacity(s)).toBe(cap0 + 3);
    const frozen = buyUpgrade(s, "processi");
    expect(frozen.upgradeLevels?.processi).toBe(3);
    expect(frozen.company.cash).toBe(s.company.cash);
  });

  it("sede levels apply factor vs rent base not compound", () => {
    let s = createInitialGameState({ city: "058091", sector: "servizi" });
    s.company.cash = 100000;
    const base = s.company.monthlyRent;
    s = buyUpgrade(s, "sede");
    expect(s.company.monthlyRent).toBeCloseTo(base * 0.85);
    s = buyUpgrade(s, "sede");
    expect(s.company.monthlyRent).toBeCloseTo(base * 0.78);
  });
```

- [ ] **Step 2: Run focused tests — expect FAIL on new cases / hasUpgrade signature**

Run: `npx vitest run src/sim/phase-staff-upgrades.test.ts`

- [ ] **Step 3: Implement actions + wire events/advanceMonth + fix all `hasUpgrade` call sites**

Grep `hasUpgrade` and `state.upgrades` under `src/` and update. At start of `advanceMonth` / `buyUpgrade` / `monthlyCapacity` consumers, ensure:

```ts
state.upgradeLevels = migrateUpgradeState(state);
```

 Prefer migrate once in `buyUpgrade` and in `createInitialGameState` / a `normalizeGameState` used when loading slots — minimal: call `migrateUpgradeState` at the top of `buyUpgrade`, `monthlyCapacity`, and `advanceMonth`.

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run src/sim/phase-staff-upgrades.test.ts src/config/upgrades.test.ts src/sim/migrateUpgrades.test.ts`

Then: `npm test`

- [ ] **Step 5: Commit**

```bash
git add src/sim/actions.ts src/sim/events.ts src/sim/advanceMonth.ts src/sim/types.ts src/sim/phase-staff-upgrades.test.ts src/store/gameStore.ts
git commit -m "feat(sim): upgrade level-up effects and buy flow"
```

---

### Task 3: UpgradesPanel UI + coach + ROADMAP

**Files:**
- Modify: `src/components/UpgradesPanel.tsx`
- Modify: `src/ui/coach.ts`
- Modify: `ROADMAP.md`
- Ensure spec/plan paths listed on Done / Next

**Interfaces:**
- Consumes: `upgradeLevel`, `nextUpgradeLevel`, `upgradeCost`, level blurbs from config
- UI per row: `Lv {n} / 3`, current blurb, if n<3 button `Acquista` (n=0) or `Potenzia` (n>0) with `formatCash(cost)`; disabled if cash < cost or n===3 show `Max Lv3`

- [ ] **Step 1: Update coach tip condition**

```ts
  if (
    game.monthsPlayed >= 3 &&
    Object.values(game.upgradeLevels ?? {}).every((lv) => !lv || lv < 1) &&
    // also treat legacy: migrateUpgradeState
    game.company.cash > 4000
  )
```

Use `migrateUpgradeState(game)` and check every id level === 0 (no keys or all 0).

- [ ] **Step 2: Rewrite UpgradesPanel**

Replace owned/includes one-shot UI with level UI as above. Intro copy:

`Potenzia i quattro pilastri fino al Lv3 — non finiscono dopo il primo acquisto.`

- [ ] **Step 3: Manual smoke**

`npm run dev` — buy processi three times; rent sede two levels; panel shows Lv.

- [ ] **Step 4: `npm test` + ROADMAP**

Done: Upgrade levels (slice 1) → this plan + midgame spec.  
Next: add Annual projects (slice 2) and Living staff (slice 3) pointing at the same spec.

- [ ] **Step 5: Commit**

```bash
git add src/components/UpgradesPanel.tsx src/ui/coach.ts ROADMAP.md docs/superpowers/specs/2026-08-07-midgame-progression-design.md docs/superpowers/plans/2026-08-07-midgame-upgrade-levels.md
git commit -m "feat(ui): upgrade level panel and roadmap slice 1"
```

Work on branch `feat/midgame-progression` from latest `main` (or from current beta branch only if user requests). Prefer **new branch from `main`** before Task 1 execution so PR #18 stays separate.

---

## Spec coverage (Slice 1)

| Spec item | Task |
|-----------|------|
| Levels 1–3 on four upgrades | 1–2 |
| Migration legacy → Lv1 | 1 |
| Effects scale (table) | 2 |
| UI Lv n/3 + cost | 3 |
| Coach when none bought | 3 |
| Slices 2–3 not built | Global |
| ROADMAP | 3 |
