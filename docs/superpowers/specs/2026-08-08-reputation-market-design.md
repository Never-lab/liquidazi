# Reputation market levers (#4) — Design

**Date:** 2026-08-08  
**Branch:** `feat/reputation-market`  
**Status:** Approved for implementation  
**Goal:** Make commercial reputation (0–100) visibly change board demand, contract odds, and AR default risk so 80→100 is no longer identical to the old `floor(rep/40)` slot cliff.

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Scope | Demand **and** risk (option C) |
| Shape | Continuous helpers (approach 1) |
| Stat | `company.reputation` only — not fiscal `compliance` |
| Ticket | Unchanged (`0.85 + rep/100 × 0.35`) |

## Formulas

| Lever | Formula | 0 / 50 / 80 / 100 |
|-------|---------|-------------------|
| Slot bonus | `repSlotBonus = clamp(round(rep/20), 0, 5)` | 0 / 3 / 4 / **5** |
| Board demand | `saleTarget × (0.75 + rep/200)` → round, min 1 | ×0.75 / 1.00 / 1.15 / 1.25 |
| Contract odds | base (PA 0.35 / priv 0.22) × `clamp(0.55 + rep/200, 0.4, 1.1)` | lower at low rep |
| AR default | existing chain × `(1.45 − rep/200)` | ~1.45 → ~0.95 |

## Non-goals

- Compliance / bank spread changes
- Demand-season backlog (#2)
- New screens; only OpportunitiesPanel tooltip
- Guida/Tutorial rewrite (wiki one-liner OK)

## UI

Reputazione chip tooltip: live slot bonus + default mult  
(e.g. `Rep 82 → +4 slot · insoluti ×0.xx`).

## Files

- `src/sim/reputation.ts` (+ tests)
- `src/sim/events.ts` — capacity + `generateOpportunities`
- `src/sim/contracts.ts` — `maybeMakeContract`
- `src/sim/advanceMonth.ts` — AR default roll
- `src/components/OpportunitiesPanel.tsx`
- `docs/wiki/sim-loop.md`, `ROADMAP.md`

## Done when

- Slot bonus differs at 80 vs 100
- Board count and contract odds scale with rep
- Low rep raises default chance; high lowers
- Tooltip explains the levers
- `npm test` green
