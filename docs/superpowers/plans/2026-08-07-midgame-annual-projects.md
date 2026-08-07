# Midgame Slice 2 — Annual Projects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Once per year, offer 2–3 investment projects; player may start exactly one; effects last 6–12 months.

**Architecture:** Catalog in `src/config/projects.ts`; state fields `projectOffer` / `activeProject`; year-turn trigger in `advanceMonth` (Dec→Jan); accept/skip actions; effects read in capacity/ticket/compliance/rent helpers; UI banner + Crescita chip.

**Tech Stack:** TypeScript, Vitest, React. No new npm deps.

**Spec:** `docs/superpowers/specs/2026-08-07-midgame-progression-design.md` (Slice 2 only)

## Global Constraints

- Slice 2 only (no living staff / morale yet — formazione may bump a `moraleBoost` field stubbed as compliance/reputation if morale absent)
- Exactly **one** active project; skip allowed
- Do not replace Investimenti / tesoreria / subsidiaries
- Italian copy; no new npm deps; `npm test` green
- Branch: `feat/midgame-slices-2-3`

## File map

| File | Role |
|------|------|
| `src/config/projects.ts` | Catalog defs |
| `src/config/projects.test.ts` | Draw / lookup tests |
| `src/sim/types.ts` | `ActiveProject`, `ProjectOffer` state |
| `src/sim/projects.ts` | drawOffer, accept, skip, tick, effect accessors |
| `src/sim/projects.test.ts` | Lifecycle tests |
| `src/sim/advanceMonth.ts` | Offer on year turn; tick active; apply rent/opex |
| `src/sim/events.ts` | Capacity / ticket from active project |
| `src/store/gameStore.ts` | `acceptProject` / `skipProjectOffer` |
| `src/components/ProjectOfferBanner.tsx` | HUD choice UI |
| `src/components/ProjectsPanel.tsx` or section in UpgradesPanel | Active chip + short blurb |
| `src/screens/GameHUD.tsx` | Render banner; block Chiudi mese while offer pending (like pendingEvent) |
| `ROADMAP.md` | Move slice 2 to Done |

---

### Task 1: Catalog + state + pure lifecycle

**Files:** create `src/config/projects.ts`, `src/config/projects.test.ts`, `src/sim/projects.ts`, `src/sim/projects.test.ts`; modify `src/sim/types.ts`

**Interfaces — produce:**

```ts
export type ProjectId =
  | "digitalizzazione"
  | "magazzino"
  | "formazione"
  | "espansione_commerciale";

export type ProjectDef = {
  id: ProjectId;
  label: string;
  blurb: string;
  cost: number;
  durationMonths: number; // 6–12
  capacityBonus: number; // 0–2 while active
  ticketMult: number; // 1 = none, e.g. 1.05
  compliancePerMonth: number; // e.g. +1
  rentFactor: number; // 1 = none, e.g. 0.97
  slotPenalty: number; // 0 or 1 while active
  frozenCash: number; // held until end (returned)
};

export type ActiveProject = {
  id: ProjectId;
  monthsLeft: number;
  frozenCash: number;
};

export type ProjectOffer = {
  year: number; // calendar year of the offer (Jan of new year)
  options: ProjectId[]; // 2–3 ids
};

// GameState fields:
activeProject: ActiveProject | null;
projectOffer: ProjectOffer | null;
projectOfferYear: number | null; // last year an offer was created (prevent double)
```

**Exact catalog (use these):**

| id | cost | months | +cap | ticket | compliance/mo | rent | slotPenalty | frozenCash |
|----|------|--------|------|--------|---------------|------|-------------|------------|
| digitalizzazione | 6000 | 9 | 1 | 1 | +1 | 1 | 0 | 0 |
| magazzino | 8000 | 12 | 0 | 1 | 0 | 0.95 | 0 | 2000 |
| formazione | 4500 | 6 | 0 | 1 | +2 | 1 | 0 | 0 |
| espansione_commerciale | 7000 | 9 | 0 | 1.06 | 0 | 1 | 1 | 0 |

- [ ] **Step 1: Failing tests** for `drawProjectOptions(rng): ProjectId[]` length 2–3 unique; `acceptProject` deducts cost + freezes cash; rejects if active exists / insufficient cash; `tickActiveProject` decrements and clears at 0 returning frozen cash.

- [ ] **Step 2: Run fail** — `npx vitest run src/config/projects.test.ts src/sim/projects.test.ts`

- [ ] **Step 3: Implement** catalog + `projects.ts` helpers + types on `GameState` / `createInitialGameState` (`null` defaults).

- [ ] **Step 4: Pass tests** + commit `feat(projects): catalog and lifecycle helpers`

---

### Task 2: Wire advanceMonth + capacity/ticket + store actions

**Files:** `advanceMonth.ts`, `events.ts`, `gameStore.ts`, tests

**Behavior:**

1. When calendar rolls Dec→Jan (`isDecember` path after calendar bump): if `!activeProject && projectOfferYear !== newYear`, set `projectOffer = { year: newYear, options: drawProjectOptions(...) }` and `projectOfferYear = newYear`.
2. Each month if `activeProject`: apply `compliancePerMonth`; decrement `monthsLeft`; if 0, add back `frozenCash`, clear active, log completion.
3. `monthlyCapacity`: add `capacityBonus`, subtract `slotPenalty` from active def.
4. Ticket / `maxDealNet`: multiply by `ticketMult` if ≠ 1.
5. Rent: if `rentFactor ≠ 1`, apply to **display/charge** path used in advanceMonth rent debit — prefer `effectiveMonthlyRent(state) = monthlyRent * (active?.rentFactor ?? 1)` without permanently mutating `monthlyRent`.
6. Store: `acceptProject(id)`, `skipProjectOffer()`; toast on accept/complete.
7. While `projectOffer` non-null, treat like `pendingEvent` for blocking `advanceMonth` from HUD (store `advanceMonth` early return + disable Chiudi mese).

- [ ] **Step 1: Tests** — close Dec with cash; after advance, `projectOffer` set with 2–3 options; accept one → active, offer null, cash down; skip → offer null, no active; after `duration` months project clears and frozen returns.

- [ ] **Step 2–4:** Implement, `npm test`, commit `feat(sim): annual project offer tick and effects`

---

### Task 3: UI banner + Crescita status + ROADMAP

**Files:** `ProjectOfferBanner.tsx`, `GameHUD.tsx`, small active-project line under UpgradesPanel or InvestmentsPanel, `ROADMAP.md`

- Banner mirrors `EventChoiceBanner`: kicker «Piano investimenti {year}», cards/buttons per option (label, cost, duration, blurb), **Salta** ghost button.
- Active: muted line `Progetto: {label} · {n} mesi` in Crescita tab (UpgradesPanel top or new thin panel).
- Coach optional tip once: «A gennaio puoi scegliere un progetto annuale».
- ROADMAP: Done annual projects slice 2; remove from Next.

- [ ] **Steps:** implement UI → smoke → `npm test` → commit `feat(ui): annual project offer banner and roadmap`

---

## Spec coverage

| Spec | Task |
|------|------|
| Yearly 2–3 offer | 2 |
| One active, duration 6–12 | 1–2 |
| Effects + tradeoffs | 1–2 |
| UI choose / active chip | 3 |
| Not replace Investimenti | Global |
| Skip / no soft-lock | 2–3 |
