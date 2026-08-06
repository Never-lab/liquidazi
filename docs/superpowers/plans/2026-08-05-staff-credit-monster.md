# Staff + Credito “mostro” Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ruoli dipendente con effetti distinti, stipendi CCNL-lite per settore/scatti, e UI credito con offerte, rata, piano ammortamento e fido chiaro.

**Architecture:** Config/tabelle in `src/config/staffPay.ts` + helper capacità/credito in `src/sim/`; `monthlyCapacity` / `generateOpportunities` / `advanceMonth` leggono punti ruolo; UI `PayrollPanel` + `LoanPanel` riscritte senza nuove deps. Mutuo: rata costante (piano francese) allineata tra preview, schedule e addebito mese.

**Tech Stack:** Vite, React, TypeScript, Zustand, Vitest (già nel repo). No nuove npm deps.

**Spec:** `docs/superpowers/specs/2026-08-05-staff-credit-monster-design.md`

## Global Constraints

- No nuove npm deps
- Copy UI in italiano
- Sim pura in `src/sim/*` (niente React lì)
- Un solo mutuo a piano + un fido (come oggi)
- Snapshot fiscale: solo `fiscalYearSnapshot`
- Test: `npm test -- --run` deve restare verde

## File map

| File | Ruolo |
|------|--------|
| `src/config/staffPay.ts` | **Create** — ruoli, base lordo per settore, scatti, costo azienda stimato |
| `src/sim/types.ts` | `Employee.senioritySteps`; opz. `Fido.lastInterest` |
| `src/sim/actions.ts` | hire/fire usano staffPay; `PRESET_ROLES` → re-export `STAFF_ROLES`; loan helpers estimate/schedule/offers; refusal reasons |
| `src/sim/events.ts` | `staffCapacityPoints`, `monthlyCapacity`, ticket + impiegati in generate |
| `src/sim/advanceMonth.ts` | scatti; compliance/heat responsabili; rata francese mutuo; `fido.lastInterest` |
| `src/components/PayrollPanel.tsx` | UI effetti + costi |
| `src/components/LoanPanel.tsx` | carte offerte + piano + fido |
| `src/sim/phase-staff-roles.test.ts` | **Create** |
| `src/sim/phase-loan-schedule.test.ts` | **Create** |
| Test esistenti | Aggiornare import `PRESET_ROLES` / gross attesi |

---

### Task 1: Config stipendi + tipi Employee

**Files:**
- Create: `src/config/staffPay.ts`
- Modify: `src/sim/types.ts` (`Employee`)
- Test: `src/sim/phase-staff-roles.test.ts` (solo test config, poi espanso in Task 2–3)

**Interfaces:**
- Produces: `StaffRole`, `STAFF_ROLES`, `baseGrossFor(sector, role)`, `grossWithSeniority(base, steps)`, `employerCostMonthly(gross)`, `capacityPointsFor(role)`, `MAX_SENIORITY_STEPS`

- [ ] **Step 1: Write failing test**

Create `src/sim/phase-staff-roles.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  STAFF_ROLES,
  baseGrossFor,
  capacityPointsFor,
  employerCostMonthly,
  grossWithSeniority,
} from "../config/staffPay";
import { fiscalYearSnapshot as snap } from "../config/fiscalYearSnapshot";

describe("staffPay config", () => {
  it("tre ruoli con punti distinti", () => {
    expect(STAFF_ROLES.map((r) => r.role)).toEqual([
      "Operaio",
      "Impiegato",
      "Responsabile",
    ]);
    expect(capacityPointsFor("Operaio")).toBe(1);
    expect(capacityPointsFor("Impiegato")).toBe(0.35);
    expect(capacityPointsFor("Responsabile")).toBe(0.5);
  });

  it("lordo servizi Operaio 1650; scatto +4%", () => {
    expect(baseGrossFor("servizi", "Operaio")).toBe(1650);
    expect(grossWithSeniority(1650, 1)).toBeCloseTo(1650 * 1.04);
  });

  it("employerCostMonthly usa snapshot", () => {
    const g = 1650;
    const expected =
      g * (1 + snap.inps_employer_rate) + g * snap.tfr_accrual_factor;
    expect(employerCostMonthly(g)).toBeCloseTo(expected);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL (module missing)**

Run: `npm test -- --run src/sim/phase-staff-roles.test.ts`  
Expected: FAIL cannot find `../config/staffPay`

- [ ] **Step 3: Implement `src/config/staffPay.ts`**

```ts
import type { SectorId } from "./market";
import { fiscalYearSnapshot as snap } from "./fiscalYearSnapshot";
import { round2 } from "../sim/types";

export type StaffRole = "Operaio" | "Impiegato" | "Responsabile";

export const MAX_SENIORITY_STEPS = 5;
export const SENIORITY_MONTHS = 24;
export const SENIORITY_BUMP = 1.04;

/** Punti capacità per ruolo (sommati in monthlyCapacity). */
export const CAPACITY_POINTS: Record<StaffRole, number> = {
  Operaio: 1,
  Impiegato: 0.35,
  Responsabile: 0.5,
};

/** Lordo base mese 0 per settore (ordine di grandezza CCNL PMI didattico). */
export const CCNL_BASE_GROSS: Record<SectorId, Record<StaffRole, number>> = {
  servizi: { Operaio: 1650, Impiegato: 2150, Responsabile: 3450 },
  commercio: { Operaio: 1600, Impiegato: 2100, Responsabile: 3400 },
  artigianato: { Operaio: 1700, Impiegato: 2050, Responsabile: 3300 },
  ristorazione: { Operaio: 1550, Impiegato: 2000, Responsabile: 3200 },
};

export const STAFF_ROLES: ReadonlyArray<{
  role: StaffRole;
  blurb: string;
}> = [
  { role: "Operaio", blurb: "+1 slot consegne" },
  {
    role: "Impiegato",
    blurb: "+0.35 slot, più lead e ticket più alti",
  },
  {
    role: "Responsabile",
    blurb: "+0.5 slot, +compliance/mese, −heat rivale",
  },
];

export const capacityPointsFor = (role: string): number =>
  CAPACITY_POINTS[role as StaffRole] ?? 0;

export const baseGrossFor = (sector: SectorId, role: StaffRole): number =>
  CCNL_BASE_GROSS[sector][role];

export const grossWithSeniority = (base: number, steps: number): number => {
  const s = Math.max(0, Math.min(MAX_SENIORITY_STEPS, steps));
  return round2(base * SENIORITY_BUMP ** s);
};

/** Costo azienda stimato (INPS datore + accantonamento TFR) sul lordo. */
export const employerCostMonthly = (gross: number): number =>
  round2(
    gross * (1 + snap.inps_employer_rate) + gross * snap.tfr_accrual_factor,
  );
```

- [ ] **Step 4: Extend `Employee` in `src/sim/types.ts`**

Add `senioritySteps: number` to `Employee` (default `0` in every place that constructs employees — `hireEmployee` next task; test helpers next).

```ts
export interface Employee {
  id: number;
  role: string;
  grossMonthly: number;
  hireMonthIdx: number;
  tfrAccrued: number;
  /** Scatti anzianità (ogni 24 mesi di servizio, cap 5). */
  senioritySteps: number;
}
```

- [ ] **Step 5: Run test — expect PASS**

Run: `npm test -- --run src/sim/phase-staff-roles.test.ts`  
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add src/config/staffPay.ts src/sim/types.ts src/sim/phase-staff-roles.test.ts
git commit -m "Add CCNL-lite staff pay config and seniority field."
```

---

### Task 2: Hire/capacity/opportunities per ruolo

**Files:**
- Modify: `src/sim/actions.ts` (`hireEmployee`, replace `PRESET_ROLES`)
- Modify: `src/sim/events.ts` (`monthlyCapacity`, `ticketCeiling`, `generateOpportunities`)
- Modify: `src/sim/phase-staff-roles.test.ts`
- Modify: tests that import `PRESET_ROLES` / expect old gross

**Interfaces:**
- Consumes: `STAFF_ROLES`, `baseGrossFor`, `capacityPointsFor` from Task 1
- Produces: `hireEmployee(state, role)` sets gross from sector + `senioritySteps: 0`
- Produces: `staffCapacityPoints(state): number`, `countRole(state, role): number`
- Produces: `export const PRESET_ROLES = STAFF_ROLES.map(...)` **compat** OR update all tests to `STAFF_ROLES` — prefer update tests to `STAFF_ROLES` and delete `PRESET_ROLES`

- [ ] **Step 1: Append failing tests** to `phase-staff-roles.test.ts`

```ts
import { hireEmployee } from "./actions";
import { generateOpportunities, monthlyCapacity, staffCapacityPoints } from "./events";
import { createInitialGameState } from "./types";

describe("ruoli differenziati", () => {
  it("hire usa lordo settore", () => {
    let s = createInitialGameState({ city: "058091", sector: "servizi" });
    s = hireEmployee(s, "Operaio");
    expect(s.employees[0]!.grossMonthly).toBe(1650);
    expect(s.employees[0]!.senioritySteps).toBe(0);
  });

  it("1 Operaio dà più capacità di 1 Impiegato", () => {
    const base = createInitialGameState({ city: "058091", sector: "servizi" });
    const withOp = hireEmployee(base, "Operaio");
    const withImp = hireEmployee(base, "Impiegato");
    expect(monthlyCapacity(withOp)).toBeGreaterThan(monthlyCapacity(withImp));
    expect(staffCapacityPoints(withOp)).toBe(1);
    expect(staffCapacityPoints(withImp)).toBe(0.35);
  });

  it("Impiegato alza i lead sale vs solo Operaio a parità di nextId seed", () => {
    let op = createInitialGameState({ city: "058091", sector: "servizi" });
    op = hireEmployee(op, "Operaio");
    let imp = createInitialGameState({ city: "058091", sector: "servizi" });
    imp = hireEmployee(imp, "Impiegato");
    // Force same board seed inputs
    op = { ...op, nextId: 50, monthsPlayed: 2 };
    imp = { ...imp, nextId: 50, monthsPlayed: 2 };
    const salesOp = generateOpportunities(op).ops.filter((o) => o.kind === "sale").length;
    const salesImp = generateOpportunities(imp).ops.filter((o) => o.kind === "sale").length;
    expect(salesImp).toBeGreaterThanOrEqual(salesOp);
  });
});
```

- [ ] **Step 2: Run — expect FAIL** on capacity/gross

Run: `npm test -- --run src/sim/phase-staff-roles.test.ts`

- [ ] **Step 3: Update `hireEmployee` in `actions.ts`**

Replace `PRESET_ROLES` with imports from `staffPay`. Hire body:

```ts
import {
  STAFF_ROLES,
  baseGrossFor,
  type StaffRole,
} from "../config/staffPay";

export { STAFF_ROLES };

export const hireEmployee = (state: GameState, role: string): GameState => {
  // hiring_freeze block unchanged…
  const def = STAFF_ROLES.find((r) => r.role === role);
  if (!def) return state;
  const staffRole = def.role as StaffRole;
  const next = structuredClone(state);
  next.employees.push({
    id: next.nextId++,
    role: staffRole,
    grossMonthly: baseGrossFor(next.company.sector, staffRole),
    hireMonthIdx: toMonthIndex(next.calendar),
    tfrAccrued: 0,
    senioritySteps: 0,
  });
  return next;
};
```

Update every test file that used `PRESET_ROLES[0].role` → `"Operaio"` or `STAFF_ROLES[0].role`, and expected gross `1800` → `baseGrossFor` / `1650` for servizi. Files: `phase3.payroll.test.ts`, `phase-staff-upgrades.test.ts`, `phase-loop-pressure.test.ts`, `phase-highimpact.test.ts`. Add `senioritySteps: 0` to manual employee fixtures in `phase3.payroll.test.ts`.

- [ ] **Step 4: Rewrite capacity in `events.ts`**

```ts
import { capacityPointsFor } from "../config/staffPay";

const STAFF_FULL_VALUE = 6;

export const staffCapacityPoints = (state: GameState): number =>
  state.employees.reduce((s, e) => s + capacityPointsFor(e.role), 0);

export const monthlyCapacity = (state: GameState): number => {
  const points = staffCapacityPoints(state);
  const core = Math.min(points, STAFF_FULL_VALUE);
  const extra = Math.max(0, points - STAFF_FULL_VALUE);
  const staffSlots = core + Math.floor(extra / 3);
  // … same repBonus, processi, temp, growth, subCap, contracts, pressure …
  const base =
    1 + staffSlots + repBonus + processi + temp + growth + subCap;
  // … soft floor unchanged …
};
```

`ticketCeiling`: add `count Impiegato * 1200`.

`generateOpportunities`: after `commercialeBonus`,

```ts
const impiegati = state.employees.filter((e) => e.role === "Impiegato").length;
let saleTarget = Math.max(1, capacity + jitter + commercialeBonus + impiegati);
```

- [ ] **Step 5: Run staff tests + full suite subset**

Run: `npm test -- --run src/sim/phase-staff-roles.test.ts src/sim/phase-staff-upgrades.test.ts src/sim/phase3.payroll.test.ts`  
Expected: PASS (adjust soft-cap test: still “100 operai non = 100 slot”)

- [ ] **Step 6: Commit**

```bash
git add src/sim/actions.ts src/sim/events.ts src/sim/*.test.ts src/config/staffPay.ts
git commit -m "Differentiate staff roles in capacity and board generation."
```

---

### Task 3: Scatti + tick Responsabile in advanceMonth

**Files:**
- Modify: `src/sim/advanceMonth.ts`
- Modify: `src/sim/phase-staff-roles.test.ts`

**Interfaces:**
- Consumes: `baseGrossFor`, `grossWithSeniority`, `SENIORITY_MONTHS`, `MAX_SENIORITY_STEPS`
- Produces: side effects each month on employees / compliance / rival.heat

- [ ] **Step 1: Failing tests**

```ts
import { advanceMonth } from "./advanceMonth";
import { toMonthIndex } from "./types"; // or existing calendar helper

it("dopo 24 mesi di servizio scatta +4% lordo", () => {
  let s = createInitialGameState({ city: "058091", sector: "servizi" });
  s = hireEmployee(s, "Operaio");
  const emp = s.employees[0]!;
  emp.hireMonthIdx = toMonthIndex(s.calendar) - 24;
  s.quietMode = true;
  s.company.cash = 100000;
  s = advanceMonth(s);
  expect(s.employees[0]!.senioritySteps).toBe(1);
  expect(s.employees[0]!.grossMonthly).toBeCloseTo(1650 * 1.04);
});

it("Responsabile: +2 compliance e −1 heat", () => {
  let s = createInitialGameState({ city: "058091", sector: "servizi" });
  s = hireEmployee(s, "Responsabile");
  s.compliance = 50;
  s.rival = { name: "Rival SA", heat: 40 };
  s.quietMode = true;
  s.company.cash = 100000;
  s = advanceMonth(s);
  expect(s.compliance).toBe(52);
  expect(s.rival!.heat).toBe(39);
});
```

(Use the real `toMonthIndex` import from wherever it lives — `types` or calendar util already used in hire.)

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: In `advanceMonth`, before or after payroll**

```ts
import {
  baseGrossFor,
  grossWithSeniority,
  MAX_SENIORITY_STEPS,
  SENIORITY_MONTHS,
  type StaffRole,
} from "../config/staffPay";

// inside advanceMonth, after cloning `next`, early in month:
for (const emp of next.employees) {
  const months = idx - emp.hireMonthIdx;
  const steps = Math.min(
    MAX_SENIORITY_STEPS,
    Math.max(0, Math.floor(months / SENIORITY_MONTHS)),
  );
  if (steps !== emp.senioritySteps) {
    emp.senioritySteps = steps;
    emp.grossMonthly = grossWithSeniority(
      baseGrossFor(next.company.sector, emp.role as StaffRole),
      steps,
    );
  }
}

const nResp = next.employees.filter((e) => e.role === "Responsabile").length;
if (nResp > 0) {
  next.compliance = Math.min(100, next.compliance + 2 * nResp);
  if (next.rival) {
    next.rival = {
      ...next.rival,
      heat: Math.max(0, next.rival.heat - nResp),
    };
  }
}
```

Note: if multiple Responsabili, spec said “+2 compliance/mese” per responsabile — use `2 * nResp`. Heat −1 per responsabile.

- [ ] **Step 4: Tests PASS**

- [ ] **Step 5: Commit**

```bash
git commit -am "Apply seniority steps and manager compliance tick."
```

---

### Task 4: UI Personale

**Files:**
- Modify: `src/components/PayrollPanel.tsx`

- [ ] **Step 1: Rewrite panel** using `STAFF_ROLES`, `baseGrossFor`, `employerCostMonthly`, `capacityPointsFor` from config; show sector from `game.company.sector`.

Each hire button:

```tsx
Assumi {r.role}
{r.blurb}
Lordo {formatCash(base)} · costo az. ~{formatCash(employerCostMonthly(base))}/mese
```

List row: ruolo, lordo, punti, scatti, licenzia.

- [ ] **Step 2: Manual check** — `npm run build` succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/PayrollPanel.tsx
git commit -m "Show staff role effects and employer cost in Personale UI."
```

---

### Task 5: Loan math — estimate, schedule, French installment in sim

**Files:**
- Modify: `src/sim/actions.ts` (add helpers; optionally keep spread helpers)
- Modify: `src/sim/advanceMonth.ts` (rata francese)
- Create: `src/sim/phase-loan-schedule.test.ts`
- Update: `src/sim/phase6.loan.test.ts` se le asserzioni su principalShare lineare falliscono

**Interfaces:**
- Produces:

```ts
export const monthlyRateFromAnnual = (annual: number): number => annual / 12;

export const frenchPayment = (principal: number, annualRate: number, tenorMonths: number): number => {
  if (tenorMonths <= 0) return 0;
  const r = monthlyRateFromAnnual(annualRate);
  if (r <= 0) return round2(principal / tenorMonths);
  const pow = (1 + r) ** tenorMonths;
  return round2((principal * r * pow) / (pow - 1));
};

export type ScheduleRow = {
  monthIndex: number; // 1-based installment number
  interest: number;
  principal: number;
  payment: number;
  residual: number;
};

export const buildLoanSchedule = (
  principal: number,
  annualRate: number,
  tenorMonths: number,
): ScheduleRow[] => { /* simulate from full principal */ };

export const remainingSchedule = (
  outstanding: number,
  annualRate: number,
  monthsLeft: number,
): ScheduleRow[] => { /* from current outstanding */ };
```

`advanceMonth` loan block:

```ts
const annualRate = /* same as now */;
const monthsLeft = Math.max(1, loan.tenorMonths - loan.monthsPaid);
const payment = frenchPayment(loan.outstanding, annualRate, monthsLeft);
// OR better: store original payment at origination
```

**Preferred (stable rata):** at `requestLoan`, compute and store `loan.monthlyPayment = frenchPayment(principal, fixedOrExpectedRate, tenorMonths)`. Each month:

```ts
const interest = round2((loan.outstanding * annualRate) / 12);
let principalShare = round2(loan.monthlyPayment - interest);
if (loan.monthsPaid + 1 >= loan.tenorMonths || principalShare > loan.outstanding) {
  principalShare = loan.outstanding;
}
const payment = round2(interest + principalShare);
```

Add to `Loan` interface in `types.ts`: `monthlyPayment: number`.

- [ ] **Step 1: Failing tests** in `phase-loan-schedule.test.ts`

```ts
it("somma capitali ≈ principal; residuo finale 0", () => {
  const P = 12000;
  const annual = 0.05;
  const n = 12;
  const rows = buildLoanSchedule(P, annual, n);
  expect(rows).toHaveLength(12);
  const sumP = rows.reduce((s, r) => s + r.principal, 0);
  expect(sumP).toBeCloseTo(P, 0);
  expect(rows[n - 1]!.residual).toBeCloseTo(0, 0);
});
```

- [ ] **Step 2: Implement helpers + `monthlyPayment` on loan + advanceMonth**

- [ ] **Step 3: Fix `phase6.loan.test.ts`** to assert French interest/principal (recompute expected with helpers).

- [ ] **Step 4: `npm test -- --run src/sim/phase6.loan.test.ts src/sim/phase-loan-schedule.test.ts` PASS

- [ ] **Step 5: Commit**

```bash
git commit -am "Use French amortization for loans and expose schedule helpers."
```

---

### Task 6: Offerte credito + refusal reasons

**Files:**
- Modify: `src/sim/actions.ts`
- Modify: `src/sim/phase-loan-schedule.test.ts`

**Interfaces:**

```ts
export type LoanOfferCard = LoanRequest & {
  id: string;
  label: string;
  annualRate: number;
  monthlyPayment: number;
  disabledReason: string | null;
};

export const loanRefusalReason = (
  state: GameState,
  principal: number,
  guarantee: LoanGuarantee,
): string | null => { … };

export const buildLoanOffers = (state: GameState): LoanOfferCard[] => {
  // 3 templates: 10k/12 none, 25k/24 none|fideiussione, 40k/36 fondo
  // annualRate from euribor + spread; monthlyPayment via frenchPayment
  // disabledReason from loanRefusalReason
};
```

Refusal copy (exact):

- `"Hai già un mutuo attivo"`
- `"Importo oltre il tetto: serve una garanzia / Fondo PMI"`
- (fido separately) `"Tetto fido ridotto (compliance)"`

- [ ] **Step 1: Tests** — `buildLoanOffers` length 3; with active loan all disabled; 40k without fondo refused.

- [ ] **Step 2: Implement**

- [ ] **Step 3: Commit**

```bash
git commit -am "Add precomputed loan offer cards and refusal reasons."
```

---

### Task 7: UI Credito (offerte + piano + fido)

**Files:**
- Modify: `src/components/LoanPanel.tsx`
- Modify: `src/sim/types.ts` — `Fido.lastInterest?: number`
- Modify: `src/sim/advanceMonth.ts` — set `fido.lastInterest = interest`

- [ ] **Step 1: Rewrite `LoanPanel`**

Structure:

1. Warning compliance (keep)
2. If `loan` active: stats + table `remainingSchedule(outstanding, rate, monthsLeft)`  
3. Else: map `buildLoanOffers(game)` to cards (label, principal, tenor, garanzia, rata, TAN%; button Richiedi disabled se reason)  
4. Toggle `personalizza` — inputs + live `frenchPayment` + `loanRefusalReason` text  
5. Fido card: limit/drawn/available/`lastInterest`; open or draw

Rescue: if `game.loanOffer`, show card “Offerta salvataggio” calling `acceptLoanOffer` / decline (wire store if missing — check `gameStore`).

- [ ] **Step 2: `npm run build` + `npm test -- --run`**

- [ ] **Step 3: Commit**

```bash
git commit -am "Rewrite Credito UI with offers, schedule, and clearer fido."
```

---

### Task 8: Regressione totale

- [ ] **Step 1:** `npm test -- --run` — all green  
- [ ] **Step 2:** `npm run build` — success  
- [ ] **Step 3:** Commit fixups only if needed; otherwise done.

---

## Spec coverage checklist

| Spec item | Task |
|-----------|------|
| Punti capacità per ruolo | 2 |
| Impiegato lead + ticket | 2 |
| Responsabile compliance/heat | 3 |
| Tabella stipendi settore | 1 |
| Scatti 24 mesi / cap 5 | 1, 3 |
| UI Personale blurbs + costo az. | 4 |
| French rata + schedule | 5 |
| 3 offerte + personalizza + refusal | 6–7 |
| Piano ammortamento UI | 7 |
| Fido chiaro + lastInterest | 7 |
| Test regressione | 2, 5, 8 |

## Self-review notes

- `PRESET_ROLES` removed in Task 2 — all call sites updated in same task.
- Loan payment model changes from linear principal to French — Task 5 owns `phase6` updates.
- `round2` import path: from `../sim/types` in config (already used elsewhere pattern) — if circular, move `round2` usage to inline `Math.round(x*100)/100` in `staffPay.ts`.
