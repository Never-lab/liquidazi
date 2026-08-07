# Holding Flip / Acquisizioni — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the lite 3-slot subsidiary portfolio into a holding loop: buy, improve (drift + CAPEX), auction-sell, and tax plusvalenza via year-end IRES.

**Architecture:** Extend `acquisitions.ts` with CAPEX/list/sell; add `config/holding.ts` tunables and `migrateHolding.ts` for saves. New `HoldingPanel` under Operazioni; strip acquisizioni from `InvestmentsPanel`. Capital gains YTD feed December IRES profit.

**Tech Stack:** TypeScript, Vitest, React, Zustand. No new npm deps.

**Spec:** `docs/superpowers/specs/2026-08-07-holding-flip-acq-design.md`

## Global Constraints

- No new npm dependencies
- Italian UI copy; didactic disclaimer (no PEX / real M&A law)
- Plusvalenza → year-end IRES only (no spot F24)
- Slots: base 4, max 8 (scalable)
- `npm test` green; keep existing quietMode drip-without-risk behavior
- Branch: `feat/holding-flip-acq`

## File map

| File | Role |
|------|------|
| `src/config/holding.ts` | Constants: slots, CAPEX, drift, multiples, offer bands |
| `src/sim/migrateHolding.ts` | Normalize subsidiaries / ytd / offers / slotCap on load |
| `src/sim/types.ts` | `Subsidiary` fields, `SaleOffer`, `capitalGains`, `holdingSlotCap`, `saleOffers` |
| `src/sim/acquisitions.ts` | buy (purchasePrice + slotCap), CAPEX, list, offers, accept/reject, drift |
| `src/sim/actions.ts` | Remove/replace `MAX_SUBSIDIARIES` export (re-export from holding or deprecate) |
| `src/sim/advanceMonth.ts` | Wire drift/offers; FY profit uses `capitalGains` |
| `src/sim/milestones.ts` | Slot unlock on milestones |
| `src/store/gameStore.ts` | New actions + migrate on hydrate |
| `src/components/HoldingPanel.tsx` | Portfolio / board / CAPEX / offers UI |
| `src/components/InvestmentsPanel.tsx` | Treasury + growth only |
| `src/components/ReportPanel.tsx` | Plusvalenze line |
| `src/screens/GameHUD.tsx` | Ops tab Holding |
| `src/ui/coach.ts` | Holding tip |
| `src/sim/phase-holding.test.ts` | Core holding tests (new) |
| Extend | `phase-invest-acq.test.ts`, `phase5.irespirap.test.ts` |

---

### Task 1: Config, types, migrate

**Files:**
- Create: `src/config/holding.ts`
- Create: `src/config/holding.test.ts`
- Create: `src/sim/migrateHolding.ts`
- Create: `src/sim/migrateHolding.test.ts`
- Modify: `src/sim/types.ts` (`YearToDate`, `Subsidiary`, `SaleOffer`, `GameState`, `createInitialGameState`)
- Modify: `src/sim/actions.ts` — change `MAX_SUBSIDIARIES` to re-export `HOLDING_SLOT_MAX` or keep name as alias of base for temporary compat: prefer `export { HOLDING_SLOT_BASE as MAX_SUBSIDIARIES } from "../config/holding"` until Task 2 updates call sites

**Interfaces:**
- Produces:
  - `HOLDING_SLOT_BASE = 4`, `HOLDING_SLOT_MAX = 8`
  - `CAPEX_EBITDA_MULT = 6`, `CAPEX_BOOST_MIN = 0.12`, `CAPEX_BOOST_MAX = 0.2`, `CAPEX_COOLDOWN_MONTHS = 6`
  - `VALUE_MULTIPLE_MIN = 8`, `VALUE_MULTIPLE_MAX = 14`
  - `OFFER_PRICE_MIN = 0.7`, `OFFER_PRICE_MAX = 1.1`
  - `LISTING_WINDOW_MONTHS = 2`
  - `PURCHASE_PRICE_FALLBACK_MULT = 10`
  - `SaleOffer { id, subsidiaryId, price, expiresMonthIdx }`
  - `Subsidiary` + `purchasePrice`, `listedUntilMonthIdx: number | null`, `capexCooldownMonths: number`
  - `YearToDate.capitalGains: number`
  - `GameState.holdingSlotCap`, `GameState.saleOffers`
  - `migrateHoldingState(game: GameState): GameState` — fills defaults, migrates subs

- [ ] **Step 1: Write failing tests**

`src/config/holding.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { HOLDING_SLOT_BASE, HOLDING_SLOT_MAX } from "./holding";

describe("holding config", () => {
  it("slot band is 4..8", () => {
    expect(HOLDING_SLOT_BASE).toBe(4);
    expect(HOLDING_SLOT_MAX).toBe(8);
  });
});
```

`src/sim/migrateHolding.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { migrateHoldingState } from "./migrateHolding";
import { createInitialGameState } from "./types";

describe("migrateHoldingState", () => {
  it("fills purchasePrice from EBITDA × 10 and defaults", () => {
    let s = createInitialGameState();
    s = {
      ...s,
      subsidiaries: [
        {
          id: 1,
          name: "Old Co",
          sector: "servizi",
          monthlyEbitda: 500,
          capacityBonus: 0,
          monthsOwned: 3,
          risk: "med",
        } as any,
      ],
    };
    delete (s as any).holdingSlotCap;
    delete (s as any).saleOffers;
    s.ytd = { revenue: 0, purchases: 0, payrollCost: 0, interest: 0, otherCosts: 0 } as any;
    const m = migrateHoldingState(s);
    expect(m.holdingSlotCap).toBe(4);
    expect(m.saleOffers).toEqual([]);
    expect(m.ytd.capitalGains).toBe(0);
    expect(m.subsidiaries[0]!.purchasePrice).toBe(5000);
    expect(m.subsidiaries[0]!.listedUntilMonthIdx).toBeNull();
    expect(m.subsidiaries[0]!.capexCooldownMonths).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run src/config/holding.test.ts src/sim/migrateHolding.test.ts
```

Expected: FAIL (modules missing)

- [ ] **Step 3: Implement config + types + migrate**

`src/config/holding.ts` — export the constants listed above.

`src/sim/types.ts` — extend interfaces; in `createInitialGameState`:
- `ytd: { …, capitalGains: 0 }`
- `holdingSlotCap: HOLDING_SLOT_BASE`
- `saleOffers: []`
- subsidiaries remain `[]`

`src/sim/migrateHolding.ts`:

```ts
import { HOLDING_SLOT_BASE, HOLDING_SLOT_MAX, PURCHASE_PRICE_FALLBACK_MULT } from "../config/holding";
import { round2, type GameState, type Subsidiary } from "./types";

const migrateSub = (sub: Subsidiary): Subsidiary => ({
  ...sub,
  purchasePrice:
    typeof sub.purchasePrice === "number" && sub.purchasePrice > 0
      ? sub.purchasePrice
      : round2(sub.monthlyEbitda * PURCHASE_PRICE_FALLBACK_MULT),
  listedUntilMonthIdx: sub.listedUntilMonthIdx ?? null,
  capexCooldownMonths: sub.capexCooldownMonths ?? 0,
});

export const migrateHoldingState = (state: GameState): GameState => {
  const next = structuredClone(state);
  next.holdingSlotCap = Math.min(
    HOLDING_SLOT_MAX,
    Math.max(HOLDING_SLOT_BASE, next.holdingSlotCap ?? HOLDING_SLOT_BASE),
  );
  next.saleOffers ??= [];
  next.ytd = { ...next.ytd, capitalGains: next.ytd.capitalGains ?? 0 };
  next.subsidiaries = (next.subsidiaries ?? []).map(migrateSub);
  return next;
};
```

Update `actions.ts`: `export { HOLDING_SLOT_BASE as MAX_SUBSIDIARIES } from "../config/holding";` (remove `= 3`) so existing imports keep compiling until Task 2.

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/config/holding.test.ts src/sim/migrateHolding.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/config/holding.ts src/config/holding.test.ts src/sim/migrateHolding.ts src/sim/migrateHolding.test.ts src/sim/types.ts src/sim/actions.ts
git commit -m "feat(holding): config, types, and save migration"
```

---

### Task 2: Valuation + buy with purchasePrice and slot cap

**Files:**
- Modify: `src/sim/acquisitions.ts`
- Modify: `src/sim/phase-invest-acq.test.ts`
- Create: `src/sim/phase-holding.test.ts` (start here; grow in later tasks)
- Modify: any import of `MAX_SUBSIDIARIES` to use `holdingSlotCap` / `HOLDING_SLOT_BASE`

**Interfaces:**
- Consumes: `HOLDING_SLOT_*`, `VALUE_MULTIPLE_*`, migrated `Subsidiary`
- Produces:
  - `estimateSubsidiaryValue(sub: Pick<Subsidiary, "monthlyEbitda" | "risk" | "monthsOwned">): number`
  - `buyAcquisition` sets `purchasePrice: target.price`, checks `subs.length >= (state.holdingSlotCap ?? HOLDING_SLOT_BASE)`

**Value formula (exact):**

```ts
const RISK_MULT = { low: 1.05, med: 1, high: 0.9 } as const;
export const estimateSubsidiaryValue = (sub: {
  monthlyEbitda: number;
  risk: AcquisitionRisk;
  monthsOwned: number;
}): number => {
  const ageBoost = Math.min(0.15, sub.monthsOwned * 0.01);
  const multiple = (VALUE_MULTIPLE_MIN + VALUE_MULTIPLE_MAX) / 2; // 11
  return round2(sub.monthlyEbitda * multiple * RISK_MULT[sub.risk] * (1 + ageBoost));
};
```

- [ ] **Step 1: Failing tests**

Add to `src/sim/phase-holding.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { HOLDING_SLOT_BASE } from "../config/holding";
import { buyAcquisition, estimateSubsidiaryValue, refreshAcquisitionBoard } from "./acquisitions";
import { createInitialGameState } from "./types";

describe("holding buy + value", () => {
  it("estimate scales with EBITDA and risk", () => {
    const base = estimateSubsidiaryValue({
      monthlyEbitda: 1000,
      risk: "med",
      monthsOwned: 0,
    });
    expect(base).toBe(11000);
    const high = estimateSubsidiaryValue({
      monthlyEbitda: 1000,
      risk: "high",
      monthsOwned: 0,
    });
    expect(high).toBe(9900);
  });

  it("buy stores purchasePrice and respects holdingSlotCap", () => {
    let s = createInitialGameState({ city: "058091", sector: "servizi" });
    s.quietMode = true;
    s.company.cash = 5_000_000;
    s.holdingSlotCap = HOLDING_SLOT_BASE;
    s = refreshAcquisitionBoard(s);
    const t = s.acquisitionBoard[0]!;
    s = buyAcquisition(s, t.id);
    expect(s.subsidiaries[0]!.purchasePrice).toBe(t.price);
    while (s.subsidiaries.length < s.holdingSlotCap) {
      s.company.cash = 5_000_000;
      const g = generateAcquisitionBoard(s);
      s.acquisitionBoard = g.board;
      s.nextId = g.nextId;
      s = buyAcquisition(s, s.acquisitionBoard[0]!.id);
    }
    expect(s.subsidiaries).toHaveLength(HOLDING_SLOT_BASE);
    s.company.cash = 5_000_000;
    const g2 = generateAcquisitionBoard(s);
    s.acquisitionBoard = g2.board;
    s.nextId = g2.nextId;
    const blocked = buyAcquisition(s, s.acquisitionBoard[0]!.id);
    expect(blocked.subsidiaries).toHaveLength(HOLDING_SLOT_BASE);
  });
});
```

Import `generateAcquisitionBoard` statically alongside `buyAcquisition`.

Update `phase-invest-acq.test.ts`: expect max length `HOLDING_SLOT_BASE` (4) instead of old 3; assert `purchasePrice`.

- [ ] **Step 2: Run — expect FAIL** on `estimateSubsidiaryValue` missing / old max 3

```bash
npx vitest run src/sim/phase-holding.test.ts src/sim/phase-invest-acq.test.ts
```

- [ ] **Step 3: Implement**

In `buyAcquisition`:
- `const cap = state.holdingSlotCap ?? HOLDING_SLOT_BASE`
- `if (subs.length >= cap) return state`
- On create sub: `purchasePrice: target.price`, `listedUntilMonthIdx: null`, `capexCooldownMonths: 0`
- Import slot constants from `../config/holding`; stop importing `MAX_SUBSIDIARIES` from actions (or keep re-export for UI until Task 7)

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(holding): purchasePrice on buy and scalable slot cap"
```

---

### Task 3: CAPEX + monthly EBITDA drift

**Files:**
- Modify: `src/sim/acquisitions.ts` (`investSubsidiaryCapex`, extend `applySubsidiaryMonth`)
- Modify: `src/sim/phase-holding.test.ts`

**Interfaces:**
- Produces:
  - `investSubsidiaryCapex(state: GameState, subsidiaryId: number): GameState`
  - Drift inside `applySubsidiaryMonth`: after `monthsOwned++`, adjust `monthlyEbitda` by risk band before drip

**CAPEX rules:**
- No-op if missing sub, listed (`listedUntilMonthIdx != null`), `capexCooldownMonths > 0`, or cash < cost
- `cost = round2(sub.monthlyEbitda * CAPEX_EBITDA_MULT)`
- `boost = CAPEX_BOOST_MIN + rand*(CAPEX_BOOST_MAX-CAPEX_BOOST_MIN)` — for determinism in action without rand: use midpoint `(0.12+0.2)/2 = 0.16` unless you pass `rand`; prefer **fixed 0.16** in v1 for simplicity
- `monthlyEbitda = round2(monthlyEbitda * (1 + 0.16))`
- `cash -= cost`; `ytd.otherCosts += cost`; `capexCooldownMonths = CAPEX_COOLDOWN_MONTHS`
- Log Italian line

**Drift (in `applySubsidiaryMonth`, before drip):**
- For each sub: decrement `capexCooldownMonths` if > 0 (min 0)
- Drift %: low `+0.01`, med `+0.005`, high `-0.005` (deterministic) × optionally × `(0.5 + rand())` — use deterministic table in quietMode / always deterministic for tests:

```ts
const DRIFT = { low: 0.01, med: 0.005, high: -0.005 } as const;
sub.monthlyEbitda = round2(Math.max(100, sub.monthlyEbitda * (1 + DRIFT[sub.risk])));
```

- [ ] **Step 1: Failing tests**

```ts
it("CAPEX raises EBITDA, costs cash, sets cooldown", () => {
  let s = createInitialGameState();
  s.company.cash = 100000;
  s.ytd.capitalGains = 0;
  s.subsidiaries = [
    {
      id: 1,
      name: "Co",
      sector: "servizi",
      monthlyEbitda: 1000,
      capacityBonus: 0,
      monthsOwned: 1,
      risk: "med",
      purchasePrice: 20000,
      listedUntilMonthIdx: null,
      capexCooldownMonths: 0,
    },
  ];
  const before = s.company.cash;
  s = investSubsidiaryCapex(s, 1);
  expect(s.subsidiaries[0]!.monthlyEbitda).toBe(1160);
  expect(s.company.cash).toBe(before - 6000);
  expect(s.ytd.otherCosts).toBe(6000);
  expect(s.subsidiaries[0]!.capexCooldownMonths).toBe(6);
  const blocked = investSubsidiaryCapex(s, 1);
  expect(blocked.company.cash).toBe(s.company.cash);
});

it("drift changes EBITDA each month", () => {
  let s = createInitialGameState();
  s.quietMode = true;
  s.subsidiaries = [
    {
      id: 1,
      name: "Co",
      sector: "servizi",
      monthlyEbitda: 1000,
      capacityBonus: 0,
      monthsOwned: 0,
      risk: "low",
      purchasePrice: 10000,
      listedUntilMonthIdx: null,
      capexCooldownMonths: 2,
    },
  ];
  applySubsidiaryMonth(s, () => 0.99);
  expect(s.subsidiaries[0]!.monthlyEbitda).toBe(1010);
  expect(s.subsidiaries[0]!.capexCooldownMonths).toBe(1);
  expect(s.company.cash).toBe(createInitialGameState().company.cash + 1010);
});
```

Fix cash assertion using the actual initial cash from the same `s` before call.

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement CAPEX + drift**

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(holding): CAPEX boost and monthly EBITDA drift"
```

---

### Task 4: List for sale + offers + accept/reject

**Files:**
- Modify: `src/sim/acquisitions.ts`
- Modify: `src/sim/advanceMonth.ts` (call offer tick — or keep all inside `applySubsidiaryMonth` / new `advanceHoldingMonth`)
- Modify: `src/sim/phase-holding.test.ts`

**Interfaces:**
- Produces:
  - `listSubsidiaryForSale(state, subsidiaryId): GameState`
  - `acceptSaleOffer(state, offerId): GameState`
  - `rejectSaleOffer(state, offerId): GameState`
  - `advanceHoldingSales(state, rand): void` — spawn/expire offers; call from `advanceMonth` near `applySubsidiaryMonth`

**List:**
- No-op if missing / already listed
- `listedUntilMonthIdx = toMonthIndex(calendar) + LISTING_WINDOW_MONTHS`
- Clear any stale offers for that id

**advanceHoldingSales (each month):**
1. Drop offers with `expiresMonthIdx < currentIdx`
2. For each listed sub with `currentIdx <= listedUntilMonthIdx`:
   - If no pending offer for that sub and `rand() < 0.55` (or always spawn once in first month of listing for testability): create offer
   - Prefer: **first month of listing always spawns 1 offer**; second month 50% chance of a second if none pending
3. Offer price: `round2(estimate * (OFFER_PRICE_MIN + rand * (OFFER_PRICE_MAX - OFFER_PRICE_MIN)))`
4. `expiresMonthIdx = currentIdx + 1`
5. If `currentIdx > listedUntilMonthIdx`: clear listing (`listedUntilMonthIdx = null`), drop offers for that sub

**acceptSaleOffer:**
- Find offer + sub; `cash += price`
- `ytd.capitalGains = round2(capitalGains + (price - purchasePrice))`
- Remove sub, remove all offers for that subsidiaryId
- Italian log with plusvalenza amount if > 0

**rejectSaleOffer:** remove offer only

- [ ] **Step 1: Failing tests**

```ts
it("list → offer → accept: cash and capitalGains", () => {
  let s = createInitialGameState();
  s.quietMode = true;
  s.company.cash = 0;
  s.ytd.capitalGains = 0;
  s.subsidiaries = [
    {
      id: 7,
      name: "Flip Co",
      sector: "servizi",
      monthlyEbitda: 1000,
      capacityBonus: 0,
      monthsOwned: 0,
      risk: "med",
      purchasePrice: 8000,
      listedUntilMonthIdx: null,
      capexCooldownMonths: 0,
    },
  ];
  s = listSubsidiaryForSale(s, 7);
  expect(s.subsidiaries[0]!.listedUntilMonthIdx).not.toBeNull();
  // force one offer
  s.saleOffers = [
    {
      id: 99,
      subsidiaryId: 7,
      price: 12000,
      expiresMonthIdx: toMonthIndex(s.calendar) + 1,
    },
  ];
  s.nextId = 100;
  const cash0 = s.company.cash;
  s = acceptSaleOffer(s, 99);
  expect(s.subsidiaries).toHaveLength(0);
  expect(s.company.cash).toBe(cash0 + 12000);
  expect(s.ytd.capitalGains).toBe(4000);
  expect(s.saleOffers).toHaveLength(0);
});

it("CAPEX blocked while listed", () => {
  let s = createInitialGameState();
  s.company.cash = 100000;
  s.subsidiaries = [
    {
      id: 1,
      name: "Co",
      sector: "servizi",
      monthlyEbitda: 1000,
      capacityBonus: 0,
      monthsOwned: 1,
      risk: "med",
      purchasePrice: 10000,
      listedUntilMonthIdx: toMonthIndex(s.calendar) + 2,
      capexCooldownMonths: 0,
    },
  ];
  const blocked = investSubsidiaryCapex(s, 1);
  expect(blocked.company.cash).toBe(s.company.cash);
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement list/accept/reject + `advanceHoldingSales`; wire in `advanceMonth` after `applySubsidiaryMonth`**

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(holding): list for sale, offers, and flip settle"
```

---

### Task 5: Plusvalenza in IRES (FY close) + Report

**Files:**
- Modify: `src/sim/advanceMonth.ts` (December profit)
- Modify: `src/components/ReportPanel.tsx`
- Modify: `src/sim/phase-holding.test.ts` and/or `phase5.irespirap.test.ts`
- Ensure FY reset includes `capitalGains: 0`

**Exact FY change:**

```ts
const { revenue, purchases, payrollCost, interest, otherCosts, capitalGains = 0 } = next.ytd;
const gainsForIres = Math.max(0, capitalGains);
const profit = round2(revenue - purchases - payrollCost - interest - otherCosts + gainsForIres);
// lastYearReport includes capitalGains: capitalGains (raw YTD)
next.ytd = { revenue: 0, purchases: 0, payrollCost: 0, interest: 0, otherCosts: 0, capitalGains: 0 };
```

IRAP base unchanged (no capitalGains in IRAP) — didactic.

- [ ] **Step 1: Failing test**

```ts
it("positive capitalGains increases December IRES", () => {
  let s = createInitialGameState();
  s.quietMode = true;
  // minimal year: only capital gains, no revenue noise
  s.ytd = {
    revenue: 0,
    purchases: 0,
    payrollCost: 0,
    interest: 0,
    otherCosts: 0,
    capitalGains: 10000,
  };
  // advance to December close: set calendar to Dec and call advanceMonth once
  s.calendar = { month: 12, year: 2024 };
  s.monthsPlayed = 11;
  s = advanceMonth(s);
  const expectedProfit = 10000 - snap.diritto_camerale_flat; // if Dec charges diritto — check advanceMonth: diritto is June only
  // If month 12 only runs FY block: profit = 10000
  expect(s.lastYearReport?.capitalGains).toBe(10000);
  expect(s.lastYearReport?.profit).toBe(10000);
  expect(s.lastYearReport?.ires).toBeCloseTo(round2(10000 * snap.ires_rate));
  expect(s.ytd.capitalGains).toBe(0);
});
```

Verify against `advanceMonth`: diritto camerale is June (`month === 5` 0-index or `month === 6`?). Read file — currently `month === 6` style. Adjust test to match real side effects (loan interest etc.). Prefer injecting gains mid-year then `playMonths` with `quietMode` and zero invoices if possible.

Safer pattern: clone phase5 helper, after 11 months set `ytd.capitalGains += 10000`, close month 12, compare IRES to baseline without gains.

- [ ] **Step 2: Run — FAIL** (report missing field / profit ignores gains)

- [ ] **Step 3: Implement FY + ReportPanel line**

```tsx
<li><span>Plusvalenze partecipate</span><span>{formatCash(selected.capitalGains ?? 0)}</span></li>
```

before utile fiscale.

- [ ] **Step 4: Run — PASS** including `phase5.irespirap.test.ts` (update profit expectations if ytd shape breaks anything — add `capitalGains: 0` wherever ytd literals exist)

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(holding): capital gains feed year-end IRES"
```

---

### Task 6: Scalable slots via milestones

**Files:**
- Modify: `src/sim/types.ts` — add milestone ids `holding_slots_5`, `holding_slots_6` … or single progression
- Modify: `src/sim/milestones.ts`
- Modify: `src/sim/phase-holding.test.ts` / `phase-supplies-milestones.test.ts`

**Design (exact):**
- On unlock `first_acquisition`: if `holdingSlotCap < 5`, set to `5` (and add milestone already exists)
- New milestones:
  - `holding_portfolio_3`: when `subsidiaries.length + soldCount` awkward — use `subsidiaries.length >= 3` at any check → `holdingSlotCap = max(cap, 6)`
  - `survive_12`: also `holdingSlotCap = max(cap, 7)`
  - `year1_profit`: `holdingSlotCap = max(cap, 8)`

Simpler exact table:

| Condition | Cap becomes at least |
|-----------|----------------------|
| `first_acquisition` unlocked | 5 |
| `monthsPlayed >= 12` (`survive_12`) | 6 |
| `year1_profit` | 7 |
| `compliance_80` | 8 |

Apply inside `unlockMilestones` after `add(...)`:

```ts
const bump = (n: number) => {
  next.holdingSlotCap = Math.min(HOLDING_SLOT_MAX, Math.max(next.holdingSlotCap ?? HOLDING_SLOT_BASE, n));
};
if (has("first_acquisition")) bump(5);
if (has("survive_12")) bump(6);
if (has("year1_profit")) bump(7);
if (has("compliance_80")) bump(8);
```

No new MilestoneId required unless you want labels — prefer **no new ids**, just bump caps when existing milestones present.

- [ ] **Step 1: Failing test** — unlock first acquisition → cap 5

- [ ] **Step 2–4: Implement + PASS**

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(holding): unlock slot cap via milestones"
```

---

### Task 7: UI + store wiring + coach

**Files:**
- Create: `src/components/HoldingPanel.tsx`
- Modify: `src/components/InvestmentsPanel.tsx` — remove acquisizioni section
- Modify: `src/screens/GameHUD.tsx` — ops tab `holding`
- Modify: `src/store/gameStore.ts` — actions + `migrateHoldingState` on load/new game paths similar to upgrades
- Modify: `src/ui/coach.ts` — tip for Holding
- Modify: `src/ui/icons.tsx` — reuse `growth` or add `holding` glyph (simple building); prefer reuse `ledger` / `growth` to avoid scope creep: use **`growth`** icon with label Holding

**Store API:**

```ts
investSubsidiaryCapex: (id: number) => void;
listSubsidiaryForSale: (id: number) => void;
acceptSaleOffer: (id: number) => void;
rejectSaleOffer: (id: number) => void;
```

Each: apply migrate → action → syncSlot → toast Italian.

**HoldingPanel content:**
- Title Holding · slot `subs.length / holdingSlotCap`
- Hint plusvalenza → IRES
- List owned with estimate, purchasePrice, CAPEX button, Metti in vendita
- Active `saleOffers` with Accetta/Rifiuta
- Acquisition board (moved from InvestmentsPanel)

**InvestmentsPanel:** delete board/subs UI; update coach string that mentioned “acquisisci fino a 3”.

- [ ] **Step 1: Manual structure** — implement panel + wire store (no new visual regression test required; keep unit tests green)

- [ ] **Step 2: Run full suite**

```bash
npm test
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/HoldingPanel.tsx src/components/InvestmentsPanel.tsx src/screens/GameHUD.tsx src/store/gameStore.ts src/ui/coach.ts
git commit -m "feat(holding): Holding panel, store actions, strip Investimenti"
```

---

### Task 8: ROADMAP note + final verify

**Files:**
- Modify: `ROADMAP.md` — short Done line for holding flip

- [ ] **Step 1: Update ROADMAP** with one bullet under Done / Now

- [ ] **Step 2: Full gate**

```bash
npm run lint
npm test
npm run build
```

Expected: all green

- [ ] **Step 3: Commit**

```bash
git commit -am "docs: mark holding flip loop on ROADMAP"
```

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| Hybrid drip + CAPEX + drift + flip | 3, 4 |
| Scalable slots 4→8 | 1, 2, 6 |
| Plusvalenza → IRES FY | 4, 5 |
| Auction lite list/offers | 4 |
| Dedicated Holding UI | 7 |
| Migrate saves | 1 |
| Report plusvalenze | 5 |
| Non-goals (PEX, spot F24, treasury untouched) | respected |

No TBD placeholders. Names consistent: `investSubsidiaryCapex`, `listSubsidiaryForSale`, `acceptSaleOffer`, `holdingSlotCap`, `ytd.capitalGains`.
