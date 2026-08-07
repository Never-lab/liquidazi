# Mid/late progression — upgrade levels, annual projects, living staff — Design

**Date:** 2026-08-07  
**Branch (suggested):** `feat/midgame-progression` (or continue beta-feedback worktree)  
**Status:** Approved for planning (Slice 1 first)  
**Goal:** Keep mid/late game meaningful: deepen the four upgrades with levels, add annual investment projects, then make staff a living capacity lever — shipped as three sequential slices.

## Context

Beta feedback: base-loop staff feels marginal; after ~year 3 the one-shot upgrade shop is empty and the Crescita panel dies. Chosen fantasy: **upgrade levels (1) + annual project cycles (3)** as spine, with **living staff** as slice 3. Delivery approach **A**: one design, three shippable slices.

Related prior work: [staff-credit-monster](2026-08-05-staff-credit-monster-design.md) (role points already exist; soft-cap still squeezes hiring), `src/config/upgrades.ts` (four one-shot ids).

## Requirements (whole program)

1. After year 3, the player still has meaningful spend/decision options in Crescita / investments.
2. Hiring remains a primary capacity lever by end of slice 3 (not optional vs upgrades alone).
3. No infinite tech tree; no real CCNL / HR simulator.
4. Saves migrate: owned upgrades today → level 1.
5. Italian copy; no new npm dependencies.

## Non-goals

- Quarterly project cadence (annual only in slice 2)
- Rewrite of GameHUD / full ops IA
- Multi-project stacking
- Certified payroll / CU / official CCNL tables
- Replacing Investimenti/tesoreria/partecipate (they stay; projects are additive)

## Slice map

| Slice | Ships | Player success |
|-------|--------|----------------|
| **1 — Upgrade levels** | Each of the 4 upgrades has Lv1→Lv2→Lv3; UI shows level, cost, current vs next effect | Catalog still worth opening after year 3 |
| **2 — Annual projects** | Once per year: pick 1 of 2–3 projects; duration 6–12 months; one active | Late decisions even when upgrades are maxed |
| **3 — Living staff** | Softer capacity soft-cap; light morale/quality; turnover pressure | Hiring stays the main capacity engine |

Implement **Slice 1 only** in the next implementation plan. Slices 2–3 stay specified here for ROADMAP / continuity.

---

## Slice 1 — Upgrade levels (implement next)

### State

Replace flat `upgrades: UpgradeId[]` with levels:

```ts
type UpgradeLevel = 0 | 1 | 2 | 3;
// Prefer: upgradeLevels: Partial<Record<UpgradeId, UpgradeLevel>>
// or Record<UpgradeId, UpgradeLevel> defaulting missing → 0
```

**Migration:** for each id in legacy `upgrades[]`, set level to `max(1, existing)`. Persist only new shape going forward (or write both briefly if needed for one release — prefer single new field + migrate on load).

`hasUpgrade(state, id)` becomes `level(id) >= 1`. Effect helpers read `level(id)`.

### Economy / effects (didactic, tune in plan tests)

Keep the four pillars. Each level costs more cash; effects stack with level (not separate products).

| Id | Lv1 (≈ today) | Lv2 | Lv3 |
|----|---------------|-----|-----|
| `gestionale_f24` | Auto-pay F24 on close if cash | Same + small didactic fee waiver or earlier auto when due | Same + minor compliance floor bump when auto-pays |
| `commerciale` | +1 board sale target; ticket bump | Stronger ticket / +board | Further ticket / +board |
| `sede` | Affitto −15% | −22% | −28% |
| `processi` | +1 capacity slot; cedolino −5% didactic | +2 slot; −7% | +3 slot; −10% |

Exact numbers live in `src/config/upgrades.ts` (extend `UpgradeDef` with `levels: { cost, blurb, … }[]` or parallel tables). Costs: Lv1 ≈ current; Lv2 ~1.6–2×; Lv3 ~2.5–3× Lv1 (sede still rent-based for Lv1; higher levels scale from that base).

### UI (`UpgradesPanel`)

- Per upgrade: label, **Lv n / 3**, current effect blurb, button **Potenzia** / **Acquista** with next cost (disabled at Lv3 or insufficient cash).
- No new screens; stay under Operazioni → Crescita.

### Tests

- Migration: legacy save with `upgrades: ["processi"]` → level 1; effects match current Lv1.
- `buyUpgrade` / level-up deducts cost, increments level, caps at 3.
- Effect helpers: processi slots and sede rent factor scale with level.
- Coach tip “upgrade” still fires when no levels bought (level 0 all).

---

## Slice 2 — Annual projects (later)

### Trigger

On year close (December→January advance) or first January ops visit: present **Piano investimenti** if no project active and year not already offered.

### Offer

Draw **2–3** defs from a small catalog (e.g. digitalizzazione, magazzino, formazione, espansione commerciale). Each:

- `cost` cash up front (or staged)
- `durationMonths` 6–12
- `effects` while active (capacity, ticket, compliance, rent, …)
- optional `tradeoff` (frozen cash, −1 slot, higher opex)

**Cap:** exactly **one** active project. On completion: clear active, allow next year’s offer.

### UI

Modal or Crescita subsection: cards with cost / duration / +/- ; Accetta one. Active project shown as a chip (name + months left).

### Non-goals for slice 2

- Replacing treasury / growth / subsidiaries investments
- More than one concurrent project

---

## Slice 3 — Living staff (later)

### Capacity

Soften `STAFF_FULL_VALUE` / excess÷3 (or raise full-value points) so early/mid hires remain worth payroll vs processi levels alone. Document new curve in plan.

### Morale / quality (light)

Per-company or per-employee band (e.g. 0–100 or low/mid/high):

- Drifts with: months in red, skipped F24, missed seniority feel, overcrowding
- Improves with: positive cash closes, Responsabile present, optional project “formazione”

Effects (pick minimal set in slice-3 plan): mild capacity point multiplier **or** monthly resignation risk; not both heavy systems.

### UI

Payroll/Personale: one **Clima** line + short effect; avoid full HR panels.

---

## Success (program)

- Year 4+ player still opens Crescita for a reason (levels and/or projects).
- Staff never feel strictly dominated by “buy processi to Lv3 and stop hiring” after slice 3.
- Each slice merges independently without blocking the next.

## ROADMAP

When Slice 1 ships: Done row + Next entries for Slice 2 and 3 pointing at this spec.
