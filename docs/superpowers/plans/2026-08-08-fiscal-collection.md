# Fiscal Collection (Riscossione) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adult fiscal-collection pipeline: monthly mora on unpaid F24, cartella at 6 months continuous overdue with pay/rateize/ignore, then enforcement and fiscal game-over.

**Architecture:** New `src/config/collection.ts` constants + `src/sim/collection.ts` for tick/open/resolve. `GameState.collectionCase`, `monthsTaxOverdue`, `loseReason`. Cartella reuses `pendingEvent` with id `fiscal_cartella`. Wire after existing one-shot F24 penalty in `advanceMonth`.

**Tech Stack:** TypeScript, Vitest, React, Zustand. No new npm deps.

**Spec:** `docs/superpowers/specs/2026-08-08-fiscal-collection-design.md`

## Global Constraints

- No new npm dependencies
- Adult Italian UI copy; README disclaimer unchanged (not live tax advice)
- Keep existing one-shot F24 penalty (`penalized` path) unchanged
- Cartella choices: paga tutto / rateizza / ignora
- Timeline: cartella at **6** continuous overdue months; rateazione **12** months @ **10%** fee; enforcement aggio **8%**; **4** months enforcement → terminal; **3** months terminal → `loseReason: "fiscal"`
- `MONTHLY_MORA_RATE = 0.01`
- While `collectionCase != null`, do not open a second cartella; skip monthly mora on liabilities (principal/plan is authoritative)
- `npm test` green
- Branch: `feat/fiscal-collection`

## File map

| File | Role |
|------|------|
| `src/config/collection.ts` | Locked numeric constants + compliance deltas |
| `src/config/collection.test.ts` | Constant sanity |
| `src/sim/types.ts` | `CollectionStage`, `CollectionCase`, `collectionCase`, `monthsTaxOverdue`, `loseReason` |
| `src/sim/collection.ts` | overdue helpers, mora, tick, open cartella, apply choice, drain |
| `src/sim/phase-collection.test.ts` | Pipeline tests |
| `src/sim/advanceMonth.ts` | Wire mora + tick; set `loseReason: "cash"` on cash loss |
| `src/store/gameStore.ts` | Gate advance on cartella; route `fiscal_cartella` resolve |
| `src/components/TaxPanel.tsx` | Riscossione block |
| `src/screens/GameHUD.tsx` | Banner stages |
| `src/screens/EndScreen.tsx` | Fiscal lose copy |
| `ROADMAP.md` | Next/Done |

---

### Task 1: Config + types

**Files:**
- Create: `src/config/collection.ts`
- Create: `src/config/collection.test.ts`
- Modify: `src/sim/types.ts`

**Interfaces:**
- Produces:
  - `MONTHLY_MORA_RATE = 0.01`
  - `MONTHS_BEFORE_CARTELLA = 6`
  - `RATEATION_MONTHS = 12`
  - `RATEATION_FEE = 0.10`
  - `ENFORCEMENT_AGGIO = 0.08`
  - `ENFORCEMENT_MONTHS_TO_TERMINAL = 4`
  - `TERMINAL_MONTHS_TO_LOST = 3`
  - `LOST_THRESHOLD_FLOOR = 2000`
  - `LOST_THRESHOLD_YTD_PCT = 0.05`
  - `COMPLIANCE_CARTELLA = 15`, `COMPLIANCE_IGNORE = 20`, `COMPLIANCE_SKIP_RATA = 10`, `COMPLIANCE_PAY_CLOSE = 5`, `COMPLIANCE_RATEATION_DONE = 8`, `COMPLIANCE_ENFORCEMENT_CLEAR = 3`
  - `lostThreshold(ytdRevenue: number): number`
  - Types: `CollectionStage`, `CollectionPlan`, `CollectionCase`
  - `GameState.collectionCase: CollectionCase | null`
  - `GameState.monthsTaxOverdue: number`
  - `GameState.loseReason: "cash" | "fiscal" | null`
  - Defaults in `createInitialGameState`: `collectionCase: null`, `monthsTaxOverdue: 0`, `loseReason: null`

- [ ] **Step 1: Write failing tests**

`src/config/collection.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  MONTHLY_MORA_RATE,
  MONTHS_BEFORE_CARTELLA,
  RATEATION_FEE,
  RATEATION_MONTHS,
  ENFORCEMENT_AGGIO,
  ENFORCEMENT_MONTHS_TO_TERMINAL,
  TERMINAL_MONTHS_TO_LOST,
  LOST_THRESHOLD_FLOOR,
  lostThreshold,
} from "./collection";

describe("collection config", () => {
  it("locks v1 constants from spec", () => {
    expect(MONTHLY_MORA_RATE).toBe(0.01);
    expect(MONTHS_BEFORE_CARTELLA).toBe(6);
    expect(RATEATION_MONTHS).toBe(12);
    expect(RATEATION_FEE).toBe(0.1);
    expect(ENFORCEMENT_AGGIO).toBe(0.08);
    expect(ENFORCEMENT_MONTHS_TO_TERMINAL).toBe(4);
    expect(TERMINAL_MONTHS_TO_LOST).toBe(3);
    expect(LOST_THRESHOLD_FLOOR).toBe(2000);
  });

  it("lostThreshold uses max(floor, 5% ytd)", () => {
    expect(lostThreshold(0)).toBe(2000);
    expect(lostThreshold(100_000)).toBe(5000);
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (missing module)

Run: `npx vitest run src/config/collection.test.ts`

- [ ] **Step 3: Implement config + types**

`src/config/collection.ts` — export constants above and:

```ts
import { round2 } from "../sim/types";

export const lostThreshold = (ytdRevenue: number): number =>
  Math.max(LOST_THRESHOLD_FLOOR, round2(ytdRevenue * LOST_THRESHOLD_YTD_PCT));
```

In `types.ts` add interfaces from spec; extend `GameState` + `createInitialGameState` defaults.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/config/collection.ts src/config/collection.test.ts src/sim/types.ts
git commit -m "feat: fiscal collection config and GameState fields"
```

---

### Task 2: Mora + overdue counter (+ no second case)

**Files:**
- Create: `src/sim/collection.ts` (helpers)
- Create: `src/sim/phase-collection.test.ts`
- Modify: `src/sim/advanceMonth.ts` (call after one-shot penalty block)

**Interfaces:**
- Produces:
  - `overdueLiabilities(state, idx)` / `overdueTotal(state, idx): number`
  - `applyMonthlyMora(state: GameState): void` — mutates unpaid with `dueIdx < idx`; **no-op if `collectionCase != null`**
  - `updateMonthsTaxOverdue(state: GameState): void` — if overdueTotal > 0 then `monthsTaxOverdue++` else `= 0`
- Consumes: `MONTHLY_MORA_RATE`, `toMonthIndex`, `round2`

- [ ] **Step 1: Write failing tests**

In `phase-collection.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { fiscalYearSnapshot as snap } from "../config/fiscalYearSnapshot";
import { MONTHLY_MORA_RATE } from "../config/collection";
import { advanceMonth } from "./advanceMonth";
import { issueCustomerInvoice, payF24 } from "./actions";
import { createInitialGameState, round2 } from "./types";

describe("fiscal mora", () => {
  it("after one-shot penalty, amount grows each further month", () => {
    let s = createInitialGameState();
    s.quietMode = true;
    s = issueCustomerInvoice(s, 1000);
    s = advanceMonth(s); // due
    s = advanceMonth(s); // one-shot
    const iva = round2(1000 * snap.iva_standard_rate);
    const afterOne = round2(iva * (1 + snap.penalty_late_pct + snap.interest_late_pct));
    expect(s.liabilities.find((l) => l.kind === "IVA")?.amount).toBeCloseTo(afterOne);
    s = advanceMonth(s); // mora
    expect(s.liabilities.find((l) => l.kind === "IVA")?.amount).toBeCloseTo(
      round2(afterOne * (1 + MONTHLY_MORA_RATE)),
    );
    expect(s.monthsTaxOverdue).toBeGreaterThanOrEqual(2);
  });

  it("paying clears monthsTaxOverdue", () => {
    let s = createInitialGameState();
    s.quietMode = true;
    s = issueCustomerInvoice(s, 1000);
    s = advanceMonth(s);
    s = advanceMonth(s);
    expect(s.monthsTaxOverdue).toBeGreaterThan(0);
    s = payF24(s);
    s = advanceMonth(s);
    expect(s.monthsTaxOverdue).toBe(0);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement helpers + wire in advanceMonth**

After the existing skipped-F24 one-shot loop in `advanceMonth.ts`:

```ts
  applyMonthlyMora(next);
  updateMonthsTaxOverdue(next);
```

Ensure `next.collectionCase ??= null` and `next.monthsTaxOverdue ??= 0` in defensive defaults.

- [ ] **Step 4: Run phase-collection + phase4.f24 tests — PASS**

Also confirm one-shot-only test in `phase4.f24.test.ts` still passes for the **first** penalty month (mora starts the *next* month after one-shot: adjust test timing so “una volta sola” still means one-shot flag, while amount may grow via mora — **update** `phase4.f24.test.ts` “una volta sola” to assert `penalized` stays true and compliance not double-hit, not that amount is frozen).

Update that test to:

```ts
  it("la sanzione one-shot non si ripete; la mora può crescere dopo", () => {
    // ... after two advances
    expect(liability?.penalized).toBe(true);
    const c = s.compliance;
    s = advanceMonth(s);
    expect(s.compliance).toBe(c); // no second compliance malus from one-shot
    expect(s.liabilities.find((l) => l.kind === "IVA")!.amount).toBeGreaterThan(amountAfterOnePenalty!);
  });
```

- [ ] **Step 5: Commit**

```bash
git add src/sim/collection.ts src/sim/phase-collection.test.ts src/sim/advanceMonth.ts src/sim/phase4.f24.test.ts
git commit -m "feat: monthly mora on overdue F24 liabilities"
```

---

### Task 3: Open cartella + resolve choices

**Files:**
- Modify: `src/sim/collection.ts`
- Modify: `src/sim/phase-collection.test.ts`
- Modify: `src/sim/advanceMonth.ts`
- Modify: `src/store/gameStore.ts`
- Modify: `src/sim/eventCatalog.ts` only if needed for `findChoiceDef` — prefer **not** putting logic in eventCatalog; handle in store

**Interfaces:**
- Produces:
  - `CARTELLA_EVENT_ID = "fiscal_cartella"`
  - `maybeOpenCartella(state: GameState): void` — if no case && `monthsTaxOverdue >= 6`, set case + `pendingEvent` with options `pay_all` | `rateize` | `ignore`
  - `resolveCartellaChoice(state, optionId): GameState` — pure clone+apply
  - `markOverdueLiabilitiesPaid(state): void` helper
  - `drainCashThenTreasury(state, amount): number` — returns amount actually taken
- Advance: call `maybeOpenCartella` after overdue counter update; if pending cartella set, still allow return (existing pending blocks next advance)
- Store `advanceMonth`: also block if `pendingEvent?.id === CARTELLA_EVENT_ID` (already blocked by any pendingEvent)
- Store `resolveEvent`: if `pendingEvent.id === CARTELLA_EVENT_ID`, call `resolveCartellaChoice` instead of `resolveEventOption`

**Cartella pending shape:**

```ts
state.pendingEvent = {
  id: "fiscal_cartella",
  title: "Cartella di pagamento",
  body: `Debito fiscale in riscossione: ${principal} €. Paga, rateizza (12 mesi +10%) o ignora (pignoramento).`,
  options: [
    { id: "pay_all", label: "Paga tutto" },
    { id: "rateize", label: "Rateizza (12 mesi)" },
    { id: "ignore", label: "Ignora" },
  ],
};
```

- [ ] **Step 1: Failing tests**

```ts
  it("a 6 mesi di insoluto apre cartella pending", () => {
    let s = createInitialGameState();
    s.quietMode = true;
    s = issueCustomerInvoice(s, 5000);
    for (let i = 0; i < 8; i++) s = advanceMonth(s); // enough continuous overdue
    // stop advancing once cartella appears
    // better: loop until pending or max
    expect(s.pendingEvent?.id).toBe("fiscal_cartella");
    expect(s.collectionCase?.stage).toBe("cartella");
  });

  it("pay_all chiude caso se cassa basta", () => {
    // build state with case cartella + high cash
    // resolveCartellaChoice(s, "pay_all")
    // expect collectionCase null, liabilities paid
  });

  it("rateize apre piano 12 mesi", () => { /* ... */ });
  it("ignore → enforcement", () => { /* ... */ });
```

Implement tests with explicit state setup where looping advance is flaky (seed liability + `monthsTaxOverdue = 6` + call `maybeOpenCartella`).

- [ ] **Step 2–4: Implement, pass, commit**

```bash
git commit -m "feat: open fiscal cartella with pay/rateize/ignore"
```

---

### Task 4: Rateazione tick + enforcement + terminal lost

**Files:**
- Modify: `src/sim/collection.ts` — `tickCollectionCase(state): void`
- Modify: `src/sim/advanceMonth.ts` — call tick; on cash lose set `loseReason = "cash"`
- Modify: `src/sim/phase-collection.test.ts`

**Interfaces:**
- `tickCollectionCase(state)`:
  - `rateazione`: try `drainCashThenTreasury(installment)`; success → monthsLeft--; at 0 close case + mark paid + compliance +8; fail → enforcement + compliance −10
  - `enforcement`: drain up to principal; aggio; monthsInStage++; clear or → terminal per spec
  - `terminal`: same drain + countdown; at `>= TERMINAL_MONTHS_TO_LOST` && principal > 0 → `status = "lost"`, `loseReason = "fiscal"`
- While case active, `maybeOpenCartella` no-ops
- Cash path in advanceMonth when `monthsBelowZero >= LOSE_MONTHS`: set `loseReason = "cash"` if not already fiscal

- [ ] **Step 1: Tests**

```ts
  it("rata saltata → enforcement", () => { /* case rateazione, cash 0 treasury 0, tick */ });
  it("enforcement preleva cassa poi tesoreria + aggio", () => { /* ... */ });
  it("dopo 4 mesi enforcement sopra soglia → terminal → lost fiscale", () => {
    // set principal high, monthsInStage, tick repeatedly
    expect(s.status).toBe("lost");
    expect(s.loseReason).toBe("fiscal");
  });
  it("clear dues before month 6 → no cartella", () => {
    // payF24 each month — never pending fiscal_cartella
  });
```

- [ ] **Step 2–4: Implement, `npx vitest run src/sim/phase-collection.test.ts`, commit**

```bash
git commit -m "feat: rateazione, pignoramento, and fiscal game-over"
```

---

### Task 5: UI — TaxPanel, HUD banner, EndScreen

**Files:**
- Modify: `src/components/TaxPanel.tsx`
- Modify: `src/screens/GameHUD.tsx`
- Modify: `src/screens/EndScreen.tsx`
- Optional CSS only if existing danger/banner classes suffice

**UI requirements:**
- TaxPanel: if `collectionCase`, show stage label (Cartella / Rateazione / Pignoramento / Chiusura), principal, monthsInStage, installment if plan
- HUD: if stage in `cartella|enforcement|terminal`, show alert banner above F24 (stronger copy)
- EndScreen: if `!won && loseReason === "fiscal"` → title/body about riscossione / insolvenza fiscale; else keep existing 12-mesi-rosso copy; if `loseReason` null on lost, treat as cash (legacy saves)

Pending cartella already uses existing pending-event UI in GameHUD — verify three buttons render via `pending.options`.

- [ ] **Step 1:** Manual/visual not required; add a tiny unit test only if there is an existing panel test pattern — otherwise skip automated UI test
- [ ] **Step 2:** Implement UI
- [ ] **Step 3:** `npm test`
- [ ] **Step 4: Commit**

```bash
git commit -m "feat: UI for fiscal collection stages and fiscal lose"
```

---

### Task 6: ROADMAP + verify gate

**Files:**
- Modify: `ROADMAP.md`

- [ ] **Step 1:** Add Done row for fiscal collection; put under Next or Done; note adult sim direction briefly if needed
- [ ] **Step 2:** Run `npm run lint && npm test && npm run build`
- [ ] **Step 3: Commit**

```bash
git commit -m "docs: ship fiscal collection slice on ROADMAP"
```

---

## Spec coverage checklist

| Spec item | Task |
|-----------|------|
| Config constants | 1 |
| Types / save defaults | 1 |
| Monthly mora + overdue counter | 2 |
| Cartella at 6m + choices | 3 |
| Rateazione / enforcement / terminal lost | 4 |
| loseReason cash vs fiscal | 4 |
| TaxPanel / HUD / EndScreen | 5 |
| ROADMAP | 6 |
| One-shot penalty kept | 2 (regression) |
