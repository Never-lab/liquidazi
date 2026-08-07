# Midgame Slice 3 — Living Staff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make hiring stay worthwhile vs maxed processi: softer capacity soft-cap + company morale that mildly scales staff points and can cause rare resignations.

**Architecture:** Raise soft-cap constants; add `staffMorale` (0–100) on `GameState`; drift in `advanceMonth`; capacity uses morale multiplier on staff points; low morale → resignation roll; PayrollPanel shows Clima; formazione project (slice 2) boosts morale if present.

**Tech Stack:** TypeScript, Vitest, React. No new npm deps.

**Spec:** `docs/superpowers/specs/2026-08-07-midgame-progression-design.md` (Slice 3 only)

**Depends on:** Slice 2 merged on same branch (formazione morale hook). If running alone, gate formazione boost with optional `activeProject?.id === "formazione"`.

## Global Constraints

- Slice 3 only beyond soft-cap + morale (no HR simulator, no per-employee UI trees)
- Pick **both light**: capacity multiplier **and** resignation only when morale &lt; 30 (rare)
- Italian copy; no new npm deps; `npm test` green
- Branch: `feat/midgame-slices-2-3`

## Numbers (exact)

| Constant | Old | New |
|----------|-----|-----|
| `STAFF_FULL_VALUE` | 6 | **8** |
| excess divisor | `floor(extra/3)` | **`floor(extra/2)`** |

Morale:

- Default on new game: **70**
- Clamp 0–100 always
- Each advanceMonth after books:
  - if `cash < 0`: −4
  - else if `lastCloseSummary?.delta >= 0`: +2
  - if any unpaid liability skipped/penalized this month path already exists: when applying F24 penalty, also −3 morale (hook one clear site)
  - if `countRole(Responsabile) >= 1`: +1
  - if `activeProject?.id === "formazione"`: +3
  - overcrowding: if `employees.length > monthlyCapacity(state) + 3`: −2
- Capacity: `effectiveStaffPoints = staffCapacityPoints * (0.75 + 0.25 * (morale/100))` then existing soft-cap math on **effective** points
- Resignation: if `morale < 30` and `employees.length > 0` and `rand() < 0.12`: remove one random employee (pay TFR via existing fire helper or inline same costs), log bad

---

### Task 1: Soft-cap + morale state + sim drift

**Files:** `src/sim/events.ts` (export/adjust `STAFF_FULL_VALUE` — currently private const; export or move to config), `src/sim/types.ts`, `src/sim/advanceMonth.ts` or `src/sim/morale.ts`, tests

- [ ] **Step 1:** Update capacity tests in `phase-staff-upgrades.test.ts` / staff tests for new curve (6 operai may still be full; document expected deltas).
- [ ] **Step 2:** Add `staffMorale` to state; `createInitialGameState` → 70; migrate missing → 70.
- [ ] **Step 3:** Implement `applyMoraleDrift(state): GameState` + resignation; call from `advanceMonth`.
- [ ] **Step 4:** Wire effective points into `monthlyCapacity`.
- [ ] **Step 5:** Tests for drift, clamp, resignation at low morale (seeded rand if available — else force morale 10 and stub high probability by temporarily testing helper with injected rand).
- [ ] Commit `feat(staff): softer capacity cap and morale drift`

If `events.ts` has no injectable rand for resignation, add `rollStaffResignation(state, rand = Math.random)`.

---

### Task 2: UI Clima + ROADMAP

**Files:** `PayrollPanel.tsx`, optional coach tip, `ROADMAP.md`

- Personale head: badge or line `Clima {n}/100 · {banda}` where banda = basso (&lt;40) / medio / alto (≥70)
- One muted sentence: basso → «Rischio dimissioni; capacità staff ridotta»; alto → «Team efficace».
- ROADMAP: Done living staff slice 3; clear Next items 1–2 for midgame.

- [ ] Implement → `npm test` → commit `feat(ui): staff clima line and roadmap slice 3`

---

## Spec coverage

| Spec | Task |
|------|------|
| Softer soft-cap | 1 |
| Morale light | 1 |
| Turnover pressure | 1 |
| UI Clima | 2 |
| Formazione synergy | 1 (if project active) |
| Not dominated by processi alone | soft-cap + morale (document smoke) |
