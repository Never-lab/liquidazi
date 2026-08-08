# Demand boom / secca (#2) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate board demand from capacity with monthly secca/normale/boom regimes (0–2 vs up to boardCap 12), multiply by reputation, and show an animated popup on extreme months.

**Architecture:** Pure helpers in `events.ts` (`rollDemandRegime`, `regimeMult`, `clampSaleTarget`, `boardCapFor`) drive `generateOpportunities`, which returns `demandRegime` for `refreshMarketBoard` / `seedNewGame` to persist on `GameState`. Store opens a one-shot `demandPopup` after month advance; `DemandPopup` host dismisses it. Accept capacity and contract RNG stay unchanged.

**Tech Stack:** TypeScript, Vitest, React, Zustand. No new npm deps.

**Spec:** `docs/superpowers/specs/2026-08-08-demand-boom-secca-design.md`

## Global Constraints

- Regime weights: secca **0.20** / normale **0.60** / boom **0.20** (independent RNG each board refresh)
- `regimeMult`: secca **0.15**, normale **1.0**, boom **1.35**
- Secca sale clamp **[0, 2]**; boom sale clamp **[1, 12]** then scale sale+supply into `boardCap` **12**; normale uses `BOARD_MAX_OPS` **10**
- Always `× repDemandMult(reputation)` before clamp
- Contracts keep own RNG; accept still gated by `monthlyCapacity`
- Soft-lock: if `supplyMonths <= 0`, ≥1 supply even in secca with 0 sales
- Popup only for secca/boom; not inbox; not `pendingEvent`
- Italian UI copy; `npm test` green
- Branch: `feat/demand-boom-secca`

## File map

| File | Role |
|------|------|
| `src/sim/types.ts` | `DemandRegime` type + `demandRegime` on `GameState` + initial `"normale"` |
| `src/sim/events.ts` | Helpers + wire `generateOpportunities` / refresh / seed |
| `src/sim/advanceMonth.ts` | `demandRegime ??= "normale"` migrate |
| `src/sim/phase-demand.test.ts` | Helper + board integration tests (create) |
| `src/store/gameStore.ts` | `demandPopup` + open on advance / dismiss |
| `src/components/DemandPopup.tsx` | Popup UI |
| `src/components/DemandPopup.module.css` | Fade + scale-in |
| `src/App.tsx` | Mount `<DemandPopupHost />` |
| `docs/wiki/sim-loop.md` | One paragraph on demand regimes |
| `ROADMAP.md` | Mark #2 shipped; Next list |

---

### Task 1: Types + demand helpers (TDD)

**Files:**
- Modify: `src/sim/types.ts`
- Modify: `src/sim/events.ts`
- Create: `src/sim/phase-demand.test.ts`

**Interfaces:**
- Produces (types): `export type DemandRegime = "secca" | "normale" | "boom"`
- Produces (GameState): `demandRegime: DemandRegime` — default `"normale"` in `createInitialGameState`
- Produces (events):
  - `export const BOARD_MAX_OPS_BOOM = 12`
  - `export const rollDemandRegime = (rand: () => number): DemandRegime` — `u = rand()`; `<0.20` secca; `<0.80` normale; else boom
  - `export const regimeMult = (r: DemandRegime): number` — `0.15 | 1 | 1.35`
  - `export const boardCapFor = (r: DemandRegime): number` — boom → `BOARD_MAX_OPS_BOOM`, else `BOARD_MAX_OPS`
  - `export const clampSaleTarget = (raw: number, r: DemandRegime): number` — secca `clamp(round(raw),0,2)`; boom `clamp(round(raw),1,12)`; normale `Math.max(1, round(raw))`

Do **not** wire `generateOpportunities` yet (Task 2).

- [ ] **Step 1: Add type + field**

In `types.ts`, export `DemandRegime` and add `demandRegime: DemandRegime` on `GameState`. In `createInitialGameState`, set `demandRegime: "normale"`.

- [ ] **Step 2: Write the failing tests**

Create `src/sim/phase-demand.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  BOARD_MAX_OPS,
  BOARD_MAX_OPS_BOOM,
  boardCapFor,
  clampSaleTarget,
  regimeMult,
  rollDemandRegime,
} from "./events";

describe("demand regime helpers", () => {
  it("rollDemandRegime respects 20/60/20 buckets", () => {
    expect(rollDemandRegime(() => 0.0)).toBe("secca");
    expect(rollDemandRegime(() => 0.199)).toBe("secca");
    expect(rollDemandRegime(() => 0.2)).toBe("normale");
    expect(rollDemandRegime(() => 0.799)).toBe("normale");
    expect(rollDemandRegime(() => 0.8)).toBe("boom");
    expect(rollDemandRegime(() => 0.999)).toBe("boom");
  });

  it("regimeMult and boardCapFor match spec", () => {
    expect(regimeMult("secca")).toBe(0.15);
    expect(regimeMult("normale")).toBe(1);
    expect(regimeMult("boom")).toBe(1.35);
    expect(boardCapFor("secca")).toBe(BOARD_MAX_OPS);
    expect(boardCapFor("normale")).toBe(BOARD_MAX_OPS);
    expect(boardCapFor("boom")).toBe(BOARD_MAX_OPS_BOOM);
    expect(BOARD_MAX_OPS_BOOM).toBe(12);
  });

  it("clampSaleTarget bands", () => {
    expect(clampSaleTarget(10, "secca")).toBe(2);
    expect(clampSaleTarget(0.1, "secca")).toBe(0);
    expect(clampSaleTarget(0, "normale")).toBe(1);
    expect(clampSaleTarget(20, "boom")).toBe(12);
    expect(clampSaleTarget(0.2, "boom")).toBe(1);
  });
});
```

- [ ] **Step 3: Run tests — expect FAIL**

Run: `npx vitest run src/sim/phase-demand.test.ts`

Expected: FAIL (exports missing / type errors).

- [ ] **Step 4: Implement helpers in `events.ts`**

```ts
import type { DemandRegime } from "./types";

export const BOARD_MAX_OPS_BOOM = 12;

export const rollDemandRegime = (rand: () => number): DemandRegime => {
  const u = rand();
  if (u < 0.2) return "secca";
  if (u < 0.8) return "normale";
  return "boom";
};

export const regimeMult = (r: DemandRegime): number =>
  r === "secca" ? 0.15 : r === "boom" ? 1.35 : 1;

export const boardCapFor = (r: DemandRegime): number =>
  r === "boom" ? BOARD_MAX_OPS_BOOM : BOARD_MAX_OPS;

export const clampSaleTarget = (raw: number, r: DemandRegime): number => {
  const n = Math.round(raw);
  if (r === "secca") return Math.min(2, Math.max(0, n));
  if (r === "boom") return Math.min(12, Math.max(1, n));
  return Math.max(1, n);
};
```

Re-export or keep `DemandRegime` only in `types.ts` (import in events).

- [ ] **Step 5: Run tests — expect PASS**

Run: `npx vitest run src/sim/phase-demand.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/sim/types.ts src/sim/events.ts src/sim/phase-demand.test.ts
git commit -m "feat: demand regime helpers and GameState field"
```

---

### Task 2: Wire board generation

**Files:**
- Modify: `src/sim/events.ts` (`generateOpportunities`, `refreshMarketBoard`, `seedNewGame`)
- Modify: `src/sim/advanceMonth.ts` (migrate `??=`)
- Modify: `src/sim/phase-demand.test.ts`

**Interfaces:**
- Consumes: helpers from Task 1
- Changes: `generateOpportunities(state, opts?: { forceRegime?: DemandRegime }): { ops; nextId; demandRegime }`
- `refreshMarketBoard` / `seedNewGame` set `next.demandRegime = demandRegime` from the return value
- Scale sale+supply using `boardCapFor(regime)` instead of bare `BOARD_MAX_OPS`
- Formula before clamp: `raw = (capacity + jitter + commerciale + impiegati) * regimeMult(regime) * repDemandMult(rep)` then `saleTarget = clampSaleTarget(raw, regime)`
- Keep supply soft-lock (`supplyMonths <= 0` → ≥1 supply)

- [ ] **Step 1: Append failing integration tests**

```ts
import { createInitialGameState } from "./types";
import { generateOpportunities, refreshMarketBoard } from "./events";

describe("generateOpportunities demand regimes", () => {
  it("secca yields 0–2 sale ops", () => {
    const s = createInitialGameState();
    // High capacity so raw would be large without clamp
    for (let i = 0; i < 20; i++) {
      s.employees.push({
        id: 1000 + i,
        role: "Operaio",
        grossMonthly: 1500,
        hireMonthIdx: 0,
        tfrAccrued: 0,
        senioritySteps: 0,
      });
    }
    const { ops, demandRegime } = generateOpportunities(s, { forceRegime: "secca" });
    expect(demandRegime).toBe("secca");
    const sales = ops.filter((o) => o.kind === "sale");
    expect(sales.length).toBeGreaterThanOrEqual(0);
    expect(sales.length).toBeLessThanOrEqual(2);
  });

  it("boom can fill boardCap 12", () => {
    const s = createInitialGameState();
    for (let i = 0; i < 30; i++) {
      s.employees.push({
        id: 2000 + i,
        role: "Operaio",
        grossMonthly: 1500,
        hireMonthIdx: 0,
        tfrAccrued: 0,
        senioritySteps: 0,
      });
    }
    s.company.reputation = 100;
    const { ops, demandRegime } = generateOpportunities(s, { forceRegime: "boom" });
    expect(demandRegime).toBe("boom");
    expect(ops.length).toBeLessThanOrEqual(12);
    expect(ops.length).toBeGreaterThan(10); // typically hits the raised cap
  });

  it("refreshMarketBoard persists demandRegime", () => {
    let s = createInitialGameState();
    s = refreshMarketBoard(s);
    expect(["secca", "normale", "boom"]).toContain(s.demandRegime);
  });
});
```

Adjust employee shape to match `Employee` in `types.ts` if fields differ — copy from an existing hire test.

- [ ] **Step 2: Run — expect FAIL** (no `forceRegime` / no return `demandRegime`).

Run: `npx vitest run src/sim/phase-demand.test.ts`

- [ ] **Step 3: Implement wire-up**

In `generateOpportunities`:

1. Build `rand` as today.
2. `const regime = opts?.forceRegime ?? rollDemandRegime(rand)` — **consume one `rand()` only when not forced** (when forced, do not call `rollDemandRegime`).
3. Compute `base = capacity + jitter + commercialeBonus + impiegati` (jitter still uses `rand()`).
4. `raw = base * regimeMult(regime) * repDemandMult(state.company.reputation)`.
5. `let saleTarget = clampSaleTarget(raw, regime)`.
6. Supply target as today; soft-lock as today.
7. Replace `BOARD_MAX_OPS` in the scale block with `const cap = boardCapFor(regime)`.
8. Return `{ ops, nextId, demandRegime: regime }`.

Update `refreshMarketBoard` and `seedNewGame`:

```ts
const { ops, nextId, demandRegime } = generateOpportunities(next);
next.opportunities = ops;
next.nextId = Math.max(next.nextId, nextId);
next.demandRegime = demandRegime;
```

In `advanceMonth.ts` near other migrates: `next.demandRegime ??= "normale"`.

Fix any call sites that destructure only `{ ops, nextId }` (must still compile — extra field is fine).

- [ ] **Step 4: Run tests — expect PASS**

Run: `npx vitest run src/sim/phase-demand.test.ts`

If boom test is flaky (`ops.length > 10`), keep `<= 12` and assert `ops.filter(sale).length >= 1` plus `boardCapFor("boom") === 12` already covered; prefer a deterministic assertion: after generate with force boom + huge staff, `ops.length === 12` or `ops.length === boardCapFor("boom")` when supply soft-lock forces mix.

- [ ] **Step 5: Commit**

```bash
git add src/sim/events.ts src/sim/advanceMonth.ts src/sim/phase-demand.test.ts
git commit -m "feat: apply monthly demand regimes to market board"
```

---

### Task 3: Demand popup UI

**Files:**
- Modify: `src/store/gameStore.ts`
- Create: `src/components/DemandPopup.tsx`
- Create: `src/components/DemandPopup.module.css`
- Modify: `src/App.tsx`

**Interfaces:**
- Store field: `demandPopup: DemandRegime | null` (only `"secca" | "boom"` ever set; never `"normale"`)
- Produces: `dismissDemandPopup: () => void`
- On successful `advanceMonth` when `game.status === "running"` and `game.demandRegime` is `secca` or `boom`: `set({ demandPopup: game.demandRegime })` (alongside existing toast logic — popup is additional, not a replacement for close toast)
- On `newGame`: if seeded board is secca/boom, optionally set popup once; **skip** on newGame to avoid fighting «Nuova azienda aperta» toast — only show after `advanceMonth` (spec: after month close / board refresh in play). Locked: **popup only from `advanceMonth`**, not `newGame`.

- [ ] **Step 1: Store wiring**

Add to store state: `demandPopup: null as DemandRegime | null`.

```ts
dismissDemandPopup: () => set({ demandPopup: null }),
```

In `advanceMonth` after `set({ game, screen, slots })`, if still running:

```ts
const regime = game.demandRegime;
if (game.status === "running" && (regime === "secca" || regime === "boom")) {
  set({ demandPopup: regime });
} else {
  set({ demandPopup: null });
}
```

(Combine with the existing `set` if cleaner — one `set` call preferred.)

- [ ] **Step 2: Component + CSS**

`DemandPopup.tsx`:

```tsx
import { useEffect } from "react";
import { useGameStore } from "../store/gameStore";
import styles from "./DemandPopup.module.css";

const COPY = {
  secca: {
    title: "Mercato in secca",
    body: "Poche commesse in vendita questo mese.",
  },
  boom: {
    title: "Picco di domanda",
    body: "Tabellone più pieno — attenzione alla capacità.",
  },
} as const;

export const DemandPopupHost = () => {
  const demandPopup = useGameStore((s) => s.demandPopup);
  const dismiss = useGameStore((s) => s.dismissDemandPopup);

  useEffect(() => {
    if (!demandPopup) return;
    const t = setTimeout(() => dismiss(), 3500);
    return () => clearTimeout(t);
  }, [demandPopup, dismiss]);

  if (demandPopup !== "secca" && demandPopup !== "boom") return null;
  const copy = COPY[demandPopup];
  return (
    <button
      type="button"
      className={styles.backdrop}
      onClick={() => dismiss()}
      aria-label="Chiudi avviso domanda"
    >
      <div className={`${styles.card} ${styles[demandPopup]}`} role="status">
        <strong className={styles.title}>{copy.title}</strong>
        <p className={styles.body}>{copy.body}</p>
      </div>
    </button>
  );
};
```

CSS: fixed full-screen backdrop (transparent/dim light), centered card, `@keyframes demandPopIn` opacity 0→1 + scale 0.94→1 (~0.28s ease-out). Use existing CSS variables (`--color-text`, `--radius-md`, etc.). No purple glow. Secca = slightly muted/danger-leaning border; boom = accent-leaning — keep subtle.

- [ ] **Step 3: Mount in `App.tsx`** next to `<ToastHost />`:

```tsx
import { DemandPopupHost } from "./components/DemandPopup";
// ...
<ToastHost />
<DemandPopupHost />
```

- [ ] **Step 4: Smoke**

Run: `npm test` (full suite). Manual not required.

- [ ] **Step 5: Commit**

```bash
git add src/store/gameStore.ts src/components/DemandPopup.tsx src/components/DemandPopup.module.css src/App.tsx
git commit -m "feat: animated demand popup for secca and boom months"
```

---

### Task 4: Docs + verify gate

**Files:**
- Modify: `docs/wiki/sim-loop.md`
- Modify: `ROADMAP.md`

- [ ] **Step 1: Wiki**

Append under Reputation (or new subsection **Demand seasons**):

```markdown
## Demand seasons (board)

Each board refresh rolls `demandRegime` (20% secca / 60% normale / 20% boom), independent of staff capacity:

- **Secca:** 0–2 sale offers (× `regimeMult` 0.15 × rep demand mult, then clamp)
- **Normale:** prior feel; board soft-cap 10
- **Boom:** board soft-cap rises to 12

Capacity still limits **accepts**. Contracts use separate RNG. Extreme months show a short in-game popup (not the mail inbox).
```

- [ ] **Step 2: ROADMAP**

- Add Done row: `| Demand boom/secca (#2) | [plan](docs/superpowers/plans/2026-08-08-demand-boom-secca.md) | [spec](docs/superpowers/specs/2026-08-08-demand-boom-secca-design.md) |`
- Strike/mark backlog item **### 2** as shipped (same style as #3/#4)
- Priority table: mark **#2** shipped
- Next #1: change to only **#6 shock senza stock** (or keep “resto balance” wording)

- [ ] **Step 3: Verify**

Run: `npm run lint && npm test && npm run build`

Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add docs/wiki/sim-loop.md ROADMAP.md
git commit -m "docs: mark demand boom/secca shipped on roadmap"
```

---

## Spec coverage checklist

| Spec item | Task |
|-----------|------|
| Weights 20/60/20 + regimeMult | 1 |
| `DemandRegime` + GameState field | 1 |
| Clamp bands + boardCap 12 | 1–2 |
| × `repDemandMult` | 2 |
| Wire generate / refresh / seed | 2 |
| Migrate `??=` | 2 |
| Supply soft-lock in secca | 2 |
| Accept capacity unchanged | 2 (no change) |
| Contracts independent | 2 (no change) |
| Popup secca/boom only | 3 |
| Not inbox / not pendingEvent | 3 |
| Wiki + ROADMAP | 4 |
| lint/test/build | 4 |
