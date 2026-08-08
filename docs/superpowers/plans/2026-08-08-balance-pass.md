# Balance Pass (#5 shock + #1 oneri staff) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply forced shocks immediately at month open (cash only; treasury bailout if cash goes negative) and charge didactic annual staff oneri each December.

**Architecture:** Change `tryQueueShock` to run the single-option `apply` immediately and never set `pendingEvent`. Add `coverNegativeCashFromTreasury` after shock apply. Add `totalAnnualStaffOneri` in `staffPay.ts` and charge it in the December block of `advanceMonth` before YTD reset / IRES. Toast the latest shock-related log from the store when `lastShockAt === monthsPlayed`.

**Tech Stack:** TypeScript, Vitest, React, Zustand. No new npm deps.

**Spec:** `docs/superpowers/specs/2026-08-08-balance-pass-design.md`

## Global Constraints

- No new npm dependencies
- Italian UI copy; didactic (not live tax law)
- Shock % base = only `company.cash`; treasury is emergency cover only if `cash < 0` after automatism
- No settlement lag on deposit/withdraw
- No soft-cap / morale extras; no backlog items #2–#4–#6
- `npm test` green
- Branch: `feat/balance-pass-shock-staff`

## File map

| File | Role |
|------|------|
| `src/sim/eventCatalog.ts` | Immediate shock apply; treasury bailout helper; no `pendingEvent` for `SHOCK_POOL` |
| `src/config/staffPay.ts` | `ANNUAL_STAFF_ONERI_*` + `totalAnnualStaffOneri` |
| `src/config/staffPay.test.ts` | Formula unit tests (create) |
| `src/sim/advanceMonth.ts` | December staff oneri before IRES / YTD reset |
| `src/sim/types.ts` | `YearReport.staffAnnualOneri` |
| `src/store/gameStore.ts` | Toast when a shock just applied |
| `src/components/ReportPanel.tsx` | Riga “Oneri annuali personale” |
| `src/sim/phase-shocks.test.ts` | Immediate apply + bailout + no pending |
| `src/sim/phase-staff-oneri.test.ts` | December charge (create) |
| `ROADMAP.md` | Move #5/#1 out of active backlog notes; Done row |

---

### Task 1: Treasury emergency cover helper

**Files:**
- Modify: `src/sim/eventCatalog.ts`
- Modify: `src/sim/phase-shocks.test.ts`

**Interfaces:**
- Produces: `export const coverNegativeCashFromTreasury = (s: GameState): number` — mutates `s`; returns amount taken from treasury (0 if none). If `cash >= 0` or `treasury <= 0`, no-op. Else `take = min(treasury, -cash)`; move `take` treasury → cash; `pushLog` with text starting with `Fondo emergenza:`.

- [ ] **Step 1: Write the failing test**

Append to `src/sim/phase-shocks.test.ts`:

```ts
import { coverNegativeCashFromTreasury } from "./eventCatalog";

describe("coverNegativeCashFromTreasury", () => {
  it("copre cassa negativa dalla tesoreria fino a zero", () => {
    const s = createInitialGameState();
    s.company.cash = -400;
    s.treasury = 1000;
    const taken = coverNegativeCashFromTreasury(s);
    expect(taken).toBe(400);
    expect(s.company.cash).toBe(0);
    expect(s.treasury).toBe(600);
    expect(s.log[0]?.text).toMatch(/Fondo emergenza/);
  });

  it("non tocca tesoreria se cassa non negativa", () => {
    const s = createInitialGameState();
    s.company.cash = 100;
    s.treasury = 500;
    expect(coverNegativeCashFromTreasury(s)).toBe(0);
    expect(s.treasury).toBe(500);
    expect(s.company.cash).toBe(100);
  });

  it("esauri tesoreria se insufficiente", () => {
    const s = createInitialGameState();
    s.company.cash = -800;
    s.treasury = 300;
    expect(coverNegativeCashFromTreasury(s)).toBe(300);
    expect(s.company.cash).toBe(-500);
    expect(s.treasury).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/sim/phase-shocks.test.ts`

Expected: FAIL — `coverNegativeCashFromTreasury` not exported / not defined.

- [ ] **Step 3: Write minimal implementation**

In `src/sim/eventCatalog.ts`, after `pushLog`, add:

```ts
/** If cash went negative, pull from treasury (emergency fund). Returns amount taken. */
export const coverNegativeCashFromTreasury = (s: GameState): number => {
  s.treasury ??= 0;
  if (s.company.cash >= 0 || s.treasury <= 0) return 0;
  const need = round2(-s.company.cash);
  const take = round2(Math.min(s.treasury, need));
  s.treasury = round2(s.treasury - take);
  s.company.cash = round2(s.company.cash + take);
  pushLog(
    s,
    "neutral",
    `Fondo emergenza: −${take.toLocaleString("it-IT")} € dalla tesoreria per coprire la cassa.`,
  );
  return take;
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/sim/phase-shocks.test.ts`

Expected: PASS for the new describe block (existing tests still OK for now).

- [ ] **Step 5: Commit**

```bash
git add src/sim/eventCatalog.ts src/sim/phase-shocks.test.ts
git commit -m "feat: cover negative cash from treasury emergency fund"
```

---

### Task 2: Apply forced shocks immediately (no pending card)

**Files:**
- Modify: `src/sim/eventCatalog.ts` (`tryQueueShock`)
- Modify: `src/sim/phase-shocks.test.ts`
- Modify: `src/store/gameStore.ts` (`advanceMonth` toast branch)

**Interfaces:**
- Consumes: `coverNegativeCashFromTreasury`, `SHOCK_POOL` option `apply`
- Produces: `tryQueueShock` applies `def.options[0].apply(state)`, then `coverNegativeCashFromTreasury(state)`, sets `lastShockAt`, does **not** set `pendingEvent`, returns `true`

- [ ] **Step 1: Write the failing tests**

Replace the test `con cassa comoda può comparire uno shock` and add:

```ts
  it("con cassa comoda può scattare uno shock immediato senza pending", () => {
    let hit = false;
    for (let m = 5; m < 80; m++) {
      let s = createInitialGameState();
      s.quietMode = false;
      s.company.cash = 25000;
      s.treasury = 0;
      s.monthsPlayed = m;
      s.lastShockAt = null;
      s.calendar = { month: 3, year: 2024 };
      s.difficulty = "normal";
      const cashBefore = s.company.cash;
      s = runWorldEvents(s);
      if (s.lastShockAt === m) {
        hit = true;
        expect(s.pendingEvent).toBeNull();
        expect(s.company.cash).toBeLessThan(cashBefore);
        break;
      }
    }
    expect(hit).toBe(true);
  });

  it("shock immediato pesca tesoreria se cassa va sotto zero", () => {
    let s = createInitialGameState();
    s.company.cash = 100;
    s.treasury = 5000;
    s.pendingEvent = {
      id: "shock_quake",
      title: "Terremoto",
      body: "…",
      options: [{ id: "ok", label: "Ok" }],
    };
    // Still support resolve for old saves: after apply, cover should run in tryQueueShock path.
    // Direct path for bailout after quake apply:
    s = resolveEventOption(s, "ok");
    // quake 20% of max(0,cash) with cash 100 → hit 20 → cash 80; not negative.
    // Use flat shock instead via fire with tiny cash:
    s = createInitialGameState();
    s.supplyMonths = 0;
    s.company.cash = 100;
    s.treasury = 2000;
    s.pendingEvent = {
      id: "shock_fire",
      title: "Incendio",
      body: "…",
      options: [{ id: "ok", label: "Ok" }],
    };
    s = resolveEventOption(s, "ok");
    // fire: −500 cash → −400; without cover cash stays −400.
    // After Task 2, resolveEventOption should also call coverNegativeCashFromTreasury.
    expect(s.company.cash).toBe(0);
    expect(s.treasury).toBe(1600);
  });
```

Keep existing `resolveEventOption` shock tests, but update the fire cash expectation if cover runs on resolve: fire with cash 10000 stays 9500 (no cover). The new test above uses cash 100.

Also change `resolveEventOption` in implementation step to call cover after apply (so old pending shocks in saves get bailout too).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/sim/phase-shocks.test.ts`

Expected: FAIL — pending still set / cash not covered on resolve fire with low cash.

- [ ] **Step 3: Write minimal implementation**

Replace body of `tryQueueShock` success path:

```ts
  const def = SHOCK_POOL[Math.floor(rand() * SHOCK_POOL.length)]!;
  const opt = def.options[0];
  if (!opt) return false;
  opt.apply(state);
  coverNegativeCashFromTreasury(state);
  state.lastShockAt = state.monthsPlayed;
  // do not set pendingEvent — damage already applied
  return true;
```

Remove the old `state.pendingEvent = toPending(def)` and the pre-apply `pushLog Imprevisto grave` **only if** each `apply` already logs; if some shocks are quiet, keep one line:

```ts
  pushLog(state, "bad", `Imprevisto grave: ${def.title}`);
```

**before** `opt.apply` only when you want a title line; prefer not duplicating — check that every SHOCK_POOL apply already `pushLog`s. If yes, skip the extra log.

In `resolveEventOption`, after `opt.apply(next)`:

```ts
  coverNegativeCashFromTreasury(next);
  next.pendingEvent = null;
```

In `src/store/gameStore.ts` `advanceMonth` toast chain, **before** the `pendingEvent` branch is fine as-is; add after lost/won and **before** pendingEvent (or after pending, as else-if):

```ts
        } else if (
          game.lastShockAt != null &&
          game.lastShockAt === game.monthsPlayed &&
          game.log[0]
        ) {
          get().flashToast(game.log[0].text, game.log[0].tone === "good" ? "good" : "bad");
          sfxMonthClose();
        } else if (game.pendingEvent) {
```

Place this so a just-applied shock toast wins over `lastCloseSummary`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/sim/phase-shocks.test.ts`

Expected: PASS. Also run `npm test` to catch store-unrelated regressions.

- [ ] **Step 5: Commit**

```bash
git add src/sim/eventCatalog.ts src/sim/phase-shocks.test.ts src/store/gameStore.ts
git commit -m "fix: apply forced shocks immediately at month open"
```

---

### Task 3: Annual staff oneri formula (config)

**Files:**
- Modify: `src/config/staffPay.ts`
- Create: `src/config/staffPay.test.ts`

**Interfaces:**
- Produces:
  - `ANNUAL_STAFF_ONERI_RATE = 0.035`
  - `ANNUAL_STAFF_ONERI_FLOOR: Record<StaffRole, number> = { Operaio: 400, Impiegato: 550, Responsabile: 700 }`
  - `annualOneriForEmployee(role: string, grossMonthly: number): number`
  - `totalAnnualStaffOneri(employees: ReadonlyArray<{ role: string; grossMonthly: number }>): number`

- [ ] **Step 1: Write the failing test**

`src/config/staffPay.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  ANNUAL_STAFF_ONERI_FLOOR,
  ANNUAL_STAFF_ONERI_RATE,
  annualOneriForEmployee,
  totalAnnualStaffOneri,
} from "./staffPay";

describe("annual staff oneri", () => {
  it("usa floor quando RAL×rate è sotto", () => {
    // gross 1000 → RAL 13000 → ×0.035 = 455; Operaio floor 400 → 455
    expect(annualOneriForEmployee("Operaio", 1000)).toBe(455);
    // gross 500 → RAL 6500 → ×0.035 = 227.5 → floor 400
    expect(annualOneriForEmployee("Operaio", 500)).toBe(400);
  });

  it("scala sul headcount", () => {
    const one = annualOneriForEmployee("Operaio", 1650);
    expect(totalAnnualStaffOneri([])).toBe(0);
    expect(
      totalAnnualStaffOneri([
        { role: "Operaio", grossMonthly: 1650 },
        { role: "Operaio", grossMonthly: 1650 },
      ]),
    ).toBe(one * 2);
  });

  it("rate e floor matchano lo spec", () => {
    expect(ANNUAL_STAFF_ONERI_RATE).toBe(0.035);
    expect(ANNUAL_STAFF_ONERI_FLOOR.Operaio).toBe(400);
    expect(ANNUAL_STAFF_ONERI_FLOOR.Impiegato).toBe(550);
    expect(ANNUAL_STAFF_ONERI_FLOOR.Responsabile).toBe(700);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/config/staffPay.test.ts`

Expected: FAIL — exports missing.

- [ ] **Step 3: Write minimal implementation**

Append to `src/config/staffPay.ts`:

```ts
export const ANNUAL_STAFF_ONERI_RATE = 0.035;

export const ANNUAL_STAFF_ONERI_FLOOR: Record<StaffRole, number> = {
  Operaio: 400,
  Impiegato: 550,
  Responsabile: 700,
};

export const annualOneriForEmployee = (
  role: string,
  grossMonthly: number,
): number => {
  const floor =
    ANNUAL_STAFF_ONERI_FLOOR[role as StaffRole] ?? ANNUAL_STAFF_ONERI_FLOOR.Operaio;
  const ral = round2(grossMonthly * 13);
  return round2(Math.max(floor, ral * ANNUAL_STAFF_ONERI_RATE));
};

export const totalAnnualStaffOneri = (
  employees: ReadonlyArray<{ role: string; grossMonthly: number }>,
): number =>
  round2(
    employees.reduce(
      (sum, e) => sum + annualOneriForEmployee(e.role, e.grossMonthly),
      0,
    ),
  );
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/config/staffPay.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/config/staffPay.ts src/config/staffPay.test.ts
git commit -m "feat: annual staff oneri formula (RAL × rate with floor)"
```

---

### Task 4: December charge + YearReport + Report UI

**Files:**
- Modify: `src/sim/types.ts` (`YearReport`)
- Modify: `src/sim/advanceMonth.ts` (December block)
- Modify: `src/components/ReportPanel.tsx`
- Create: `src/sim/phase-staff-oneri.test.ts`

**Interfaces:**
- Consumes: `totalAnnualStaffOneri`
- Produces: `YearReport.staffAnnualOneri: number` (default 0 on old reports via `?? 0` in UI)

- [ ] **Step 1: Write the failing test**

`src/sim/phase-staff-oneri.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { totalAnnualStaffOneri } from "../config/staffPay";
import { advanceMonth } from "./advanceMonth";
import { createInitialGameState } from "./types";

describe("oneri annuali personale a dicembre", () => {
  it("addebita oneri e li mette nel report", () => {
    let s = createInitialGameState();
    s.quietMode = true;
    s.calendar = { month: 12, year: 2024 };
    s.company.cash = 50_000;
    s.employees = [
      {
        id: 1,
        role: "Operaio",
        grossMonthly: 1650,
        hireMonthIdx: 0,
        tfrAccrued: 0,
        senioritySteps: 0,
      },
      {
        id: 2,
        role: "Operaio",
        grossMonthly: 1650,
        hireMonthIdx: 0,
        tfrAccrued: 0,
        senioritySteps: 0,
      },
    ];
    const expected = totalAnnualStaffOneri(s.employees);
    expect(expected).toBeGreaterThan(0);
    const cashBefore = s.company.cash;
    s = advanceMonth(s);
    expect(s.lastYearReport?.staffAnnualOneri).toBe(expected);
    expect(s.company.cash).toBeLessThan(cashBefore - expected + 1);
    // otherCosts on report includes the oneri
    expect(s.lastYearReport!.otherCosts).toBeGreaterThanOrEqual(expected);
  });

  it("zero dipendenti → oneri 0", () => {
    let s = createInitialGameState();
    s.quietMode = true;
    s.calendar = { month: 12, year: 2024 };
    s.employees = [];
    s.company.cash = 20_000;
    s = advanceMonth(s);
    expect(s.lastYearReport?.staffAnnualOneri ?? 0).toBe(0);
  });
});
```

Note: `advanceMonth` with `quietMode` still runs December fiscal block. Payroll and other December costs also hit cash — assert `staffAnnualOneri` on report and that `otherCosts >= expected`. Set `s.quietMode = true` after create.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/sim/phase-staff-oneri.test.ts`

Expected: FAIL — `staffAnnualOneri` undefined / 0.

- [ ] **Step 3: Write minimal implementation**

In `src/sim/types.ts`, extend `YearReport`:

```ts
export interface YearReport extends YearToDate {
  year: number;
  profit: number;
  irapBase: number;
  ires: number;
  irap: number;
  /** Oneri annuali personale (didattici), 0 se assenti. */
  staffAnnualOneri?: number;
}
```

In `src/sim/advanceMonth.ts`, import `totalAnnualStaffOneri` from `../config/staffPay`. Inside `if (month === 12)`, **before** reading ytd for IRES:

```ts
  if (month === 12) {
    const staffOneri = totalAnnualStaffOneri(next.employees);
    if (staffOneri > 0) {
      const b = next.company.cash;
      next.company.cash = round2(next.company.cash - staffOneri);
      next.ytd.otherCosts = round2(next.ytd.otherCosts + staffOneri);
      next.log.unshift({
        id: next.nextId++,
        monthIdx: idx,
        tone: "bad",
        text: `Oneri annuali personale: −${staffOneri.toLocaleString("it-IT")} € (${next.employees.length} dipendenti).`,
      });
      next.log = next.log.slice(0, 12);
      note("Oneri annuali personale", b);
    }

    const { revenue, purchases, payrollCost, interest, otherCosts, capitalGains = 0 } = next.ytd;
    // ... existing IRES/IRAP ...
    next.lastYearReport = {
      year: next.calendar.year,
      revenue,
      purchases,
      payrollCost,
      interest,
      otherCosts,
      capitalGains,
      profit,
      irapBase,
      ires,
      irap,
      staffAnnualOneri: staffOneri,
    };
    // ... rest unchanged
  }
```

Confirm `idx` is in scope in that block (it is used for liabilities as `idx + 6`). If the local month-index variable has another name, use the same one as diritto camerale / liabilities.

In `ReportPanel.tsx`, after “Costo del personale” (or after “Altri costi”):

```tsx
        <li>
          <span>Oneri annuali personale</span>
          <span>−{formatCash(selected.staffAnnualOneri ?? 0)}</span>
        </li>
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/sim/phase-staff-oneri.test.ts src/config/staffPay.test.ts`

Then: `npm test`

Expected: PASS. Fix assertion on cash if other December charges make `toBeLessThan(cashBefore - expected + 1)` flaky — prefer:

```ts
expect(s.lastYearReport?.staffAnnualOneri).toBe(expected);
expect(s.lastYearReport!.otherCosts).toBeGreaterThanOrEqual(expected);
```

and drop the fragile cash inequality if needed.

- [ ] **Step 5: Commit**

```bash
git add src/sim/types.ts src/sim/advanceMonth.ts src/components/ReportPanel.tsx src/sim/phase-staff-oneri.test.ts
git commit -m "feat: charge annual staff oneri at December FY close"
```

---

### Task 5: ROADMAP + verify gate

**Files:**
- Modify: `ROADMAP.md`

- [ ] **Step 1: Update ROADMAP**

In **Done**, add a row:

| Balance pass (#5 shock timing + #1 oneri staff) | [docs/superpowers/plans/2026-08-08-balance-pass.md](docs/superpowers/plans/2026-08-08-balance-pass.md) | [spec](docs/superpowers/specs/2026-08-08-balance-pass-design.md) |

In **Next**, change item 1 from “Balance pass Normale” to note remaining backlog (#2–#4–#6) or keep “Balance pass (resto: domanda/scorte/rep/stock)” as next.

In **Backlog bilanciamento**, mark items **#5** and **#1** as done (strike or “→ shipped”).

- [ ] **Step 2: Full verify**

Run: `npm run lint && npm test && npm run build`

Expected: all green.

- [ ] **Step 3: Commit**

```bash
git add ROADMAP.md
git commit -m "docs: mark balance pass #5+#1 shipped in ROADMAP"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Shock apply at month open, no blocking pay card | Task 2 |
| % / shock cash only; treasury untouched if cash ≥ 0 | Task 1–2 |
| Bailout if cash &lt; 0 | Task 1–2 |
| Toast/log message | Task 2 (log in apply + store toast) |
| Comfort/cooldown unchanged | Task 2 (no changes to those formulas) |
| December oneri, formula rate/floor | Task 3–4 |
| Report line + otherCosts / staffAnnualOneri | Task 4 |
| ROADMAP update | Task 5 |
| No settlement / no items #2–#6 | (out of scope — no tasks) |
