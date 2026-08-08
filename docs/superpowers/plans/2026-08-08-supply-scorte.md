# Supply / scorte pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scale emergency restock to 10% of cash (floor 1500), give contracts +8% net when stocked, slightly lower defaults with stock, and show +1/+2 months on supply cards.

**Architecture:** Pure helpers on `events.ts` (`emergencySupplyNet`, `supplyMonthsFromNet`); wire into `orderEmergencySupply`, accept/log/UI; contract accept applies stock bonus; `advanceMonth` multiplies AR defaults.

**Tech Stack:** TypeScript, Vitest, React. No new deps.

**Spec:** `docs/superpowers/specs/2026-08-08-supply-scorte-design.md`

## Global Constraints

- `emergencySupplyNet = max(1500, round(cash * 0.10))`
- `supplyMonthsFromNet(net) = net >= 1200 ? 2 : 1`
- Contract +8% only if `supplyMonths > 0` at accept
- Default ×0.85 when stocked (empty still ×1.45 in existing boost)
- Keep supply cap 6; no demand-season work
- Branch: `feat/supply-scorte`

## File map

| File | Role |
|------|------|
| `src/sim/events.ts` | Helpers, emergency, supply title/accept |
| `src/sim/contracts.ts` | +8% netPerMonth |
| `src/sim/advanceMonth.ts` | default ×0.85 |
| `src/components/OpportunitiesPanel.tsx` | Card + button + chip |
| `src/sim/phase-supply-emergency.test.ts` | Tests |
| `docs/wiki/help/finanza.md`, guide sync, `ROADMAP.md` | Docs |

---

### Task 1: Helpers + emergency cost

**Files:**
- Modify: `src/sim/events.ts`
- Modify: `src/sim/phase-supply-emergency.test.ts`

**Interfaces:**
- Produces: `export const EMERGENCY_SUPPLY_FLOOR = 1500`
- Produces: `export const emergencySupplyNet = (state: GameState): number => Math.max(EMERGENCY_SUPPLY_FLOOR, Math.round(state.company.cash * 0.1))`
- Produces: `export const supplyMonthsFromNet = (net: number): number => (net >= 1200 ? 2 : 1)`
- Keep `EMERGENCY_SUPPLY_NET = 750` removed or deprecated — replace all uses with floor/helper
- `orderEmergencySupply` uses `emergencySupplyNet(state)` for AP + log

- [ ] **Step 1: Extend failing tests** in `phase-supply-emergency.test.ts`:

```ts
it("emergency scales with cash at 10%, floor 1500", () => {
  const s = createInitialGameState();
  s.supplyMonths = 0;
  s.company.cash = 50000;
  expect(emergencySupplyNet(s)).toBe(5000);
  s.company.cash = 10000;
  expect(emergencySupplyNet(s)).toBe(1500);
});

it("supplyMonthsFromNet breakpoints", () => {
  expect(supplyMonthsFromNet(1199)).toBe(1);
  expect(supplyMonthsFromNet(1200)).toBe(2);
});

it("ordine emergenza alza scorte e crea AP al prezzo scalato", () => {
  let s = createInitialGameState();
  s.supplyMonths = 0;
  s.company.cash = 50000;
  const inv0 = s.invoices.length;
  const cost = emergencySupplyNet(s);
  s = orderEmergencySupply(s);
  expect(s.supplyMonths).toBe(2);
  expect(s.invoices.at(-1)?.net).toBe(cost);
  expect(cost).toBe(5000);
});
```

- [ ] **Step 2: Implement helpers + wire `orderEmergencySupply`**; update `pushSupply` title to include `· +N mesi`; accept path uses `supplyMonthsFromNet`.

- [ ] **Step 3: Commit** `feat: scale emergency supply cost and expose months helpers`

---

### Task 2: Contract +8% and default ×0.85

**Files:**
- Modify: `src/sim/contracts.ts`
- Modify: `src/sim/advanceMonth.ts`
- Modify: `src/sim/phase-supply-emergency.test.ts` (or small contract test)

- [ ] **Step 1: Test** acceptAsContract with supplyMonths 2 → netPerMonth = round2((op.net/months)*1.08); with 0 → no boost.

- [ ] **Step 2: Implement** in `acceptAsContract`; in advanceMonth multiply default roll by `(supplyMonths > 0 ? 0.85 : 1)`.

- [ ] **Step 3: Commit** `feat: stocked contracts pay more and default less`

---

### Task 3: UI + docs

**Files:**
- Modify: `OpportunitiesPanel.tsx`, `gameStore.ts` toast if needed
- Modify: `docs/wiki/help/finanza.md` → `npm run wiki:sync-help`
- Modify: `ROADMAP.md` mark #3 shipped

- [ ] **Step 1:** Supply meta `· +N mesi scorte`; emergency button live cost; Scorte tooltip.

- [ ] **Step 2:** Wiki + ROADMAP; sync guide pages.

- [ ] **Step 3:** `npm run lint && npm test && npm run build`; commit `feat: clarify supply months UI and docs`

---

## Spec coverage

Emergency 10%/floor 1500 → T1; contract +8% + default 0.85 → T2; UI months + docs → T3.
