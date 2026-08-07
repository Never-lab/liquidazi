# Commesse Stats Clarity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the opaque Commesse badge with labeled chips + native `title` tooltips, and add a one-shot coach tip that explains the legend.

**Architecture:** Copy and tooltips live in `OpportunitiesPanel`; coach tip in `coachTipFor` after F24 priority and before hire. CSS wrap chips in `panels.module.css`. No new components or dependencies.

**Tech Stack:** React, TypeScript, CSS modules, Vitest. No new npm deps.

**Spec:** `docs/superpowers/specs/2026-08-07-commesse-stats-clarity-design.md`

## Global Constraints

- No new npm dependencies
- Italian copy matching the spec table verbatim for labels/`title`
- Native `title` only — no custom tooltip/popover
- Sticky header (`scorte` / `rep` short labels) unchanged
- Δ cassa banner unchanged
- `npm test` green

## File map

| File | Role |
|------|------|
| `src/ui/coach.ts` | Add `commesse-legend` tip |
| `src/ui/coach.test.ts` | Unit tests for tip priority |
| `src/components/OpportunitiesPanel.tsx` | Labeled chips + `title` |
| `src/components/panels.module.css` | Chip row layout |
| `ROADMAP.md` | Add Next/Done line when shipping |
| Spec (already on branch) | `docs/superpowers/specs/2026-08-07-commesse-stats-clarity-design.md` |

---

### Task 1: Coach tip `commesse-legend`

**Files:**
- Modify: `src/ui/coach.ts`
- Create: `src/ui/coach.test.ts`

**Interfaces:**
- Consumes: `coachTipFor(game: GameState): CoachTip | null`, `createInitialGameState()`
- Produces: tip id `"commesse-legend"` when `monthsPlayed >= 1 && monthsPlayed < 3`, after pending-event / first-deal / close-month / f24 checks, before hire

- [ ] **Step 1: Write the failing tests**

Create `src/ui/coach.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createInitialGameState } from "../sim/types";
import { coachTipFor } from "./coach";

describe("coachTipFor commesse-legend", () => {
  it("shows after month 0 loop tips when monthsPlayed is 1–2 and no F24 due", () => {
    const s = createInitialGameState();
    s.monthsPlayed = 1;
    s.liabilities = [];
    const tip = coachTipFor(s);
    expect(tip?.id).toBe("commesse-legend");
    expect(tip?.title).toMatch(/commesse/i);
  });

  it("does not override F24 tip when liabilities are unpaid", () => {
    const s = createInitialGameState();
    s.monthsPlayed = 1;
    s.liabilities = [
      {
        id: 1,
        kind: "IVA",
        amount: 100,
        dueIdx: 2024 * 12 + 1,
        paid: false,
        penalized: false,
      },
    ];
    expect(coachTipFor(s)?.id).toBe("f24");
  });

  it("does not show on month 0 (first-deal wins)", () => {
    const s = createInitialGameState();
    s.monthsPlayed = 0;
    s.invoices = [];
    expect(coachTipFor(s)?.id).toBe("first-deal");
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npx vitest run src/ui/coach.test.ts`

Expected: FAIL (tip id not `commesse-legend` / tip missing)

- [ ] **Step 3: Implement tip in `coach.ts`**

Insert this block **after** the F24 tip block and **before** the hire tip:

```ts
  if (game.monthsPlayed >= 1 && game.monthsPlayed < 3) {
    return {
      id: "commesse-legend",
      title: "Cosa significano i numeri sopra le commesse",
      body: "Capacità = vendite accettate / slot del mese; Tetto max = limite per una singola vendita; Scorte = mesi di magazzino. Su desktop, passa sui chip per il dettaglio.",
    };
  }
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npx vitest run src/ui/coach.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/coach.ts src/ui/coach.test.ts
git commit -m "feat(coach): legend tip for Commesse stats"
```

---

### Task 2: Labeled chips + CSS in OpportunitiesPanel

**Files:**
- Modify: `src/components/OpportunitiesPanel.tsx`
- Modify: `src/components/panels.module.css`
- Modify: `ROADMAP.md` (Next → Done when done)

**Interfaces:**
- Consumes: existing `maxDealNet`, `monthlyCapacity`, `salesAcceptedThisMonth`, `formatCash`
- Produces: five labeled chips with `title` strings from the spec (Contratti only if count > 0)

- [ ] **Step 1: Replace badge markup in `OpportunitiesPanel.tsx`**

Replace the `<span className={styles.badge}>…</span>` block with:

```tsx
        <div className={styles.statChips} aria-label="Indicatori commesse">
          <span
            className={styles.statChip}
            title="Massimo netto accettabile su una singola vendita questo mese"
          >
            Tetto max {formatCash(cap)}
          </span>
          <span
            className={styles.statChip}
            title="Vendite accettate / slot disponibili questo mese"
          >
            Capacità {taken}/{capacity}
          </span>
          <span
            className={styles.statChip}
            title="Mesi di magazzino; a zero ticket più bassi e più insoluti"
          >
            Scorte {game.supplyMonths ?? 0} mesi
          </span>
          <span
            className={styles.statChip}
            title="Quanto ti cercano i clienti (0–100)"
          >
            Reputazione {Math.round(game.company.reputation)}
          </span>
          {(game.activeContracts?.length ?? 0) > 0 ? (
            <span
              className={styles.statChip}
              title="Contratti multi-mese attivi: ognuno blocca 1 slot"
            >
              Contratti {game.activeContracts!.length}
            </span>
          ) : null}
        </div>
```

Keep `panelHead` / title / muted paragraph / cards unchanged.

- [ ] **Step 2: Add CSS in `panels.module.css`**

After `.badge { … }`, add:

```css
.statChips {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
  max-width: min(100%, 28rem);
}

.statChip {
  font-size: 11px;
  font-weight: 600;
  font-family: var(--font-mono);
  color: var(--color-accent);
  background: var(--color-accent-soft);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  cursor: help;
}
```

Adjust `.panelHead` if needed so chips wrap cleanly on narrow screens (`align-items: flex-start` is ok).

- [ ] **Step 3: Manual smoke (dev)**

Run: `npm run dev`

Check:
1. Commesse head shows labeled chips, not `tetto · slot · …`
2. Hover (desktop) shows Italian `title` text
3. Contratti chip absent when no contracts
4. After closing month 1 with Guide on and no unpaid F24, coach shows the legend tip
5. Sticky header still uses short `scorte` / `rep`

- [ ] **Step 4: Full test suite**

Run: `npm test`

Expected: PASS

- [ ] **Step 5: ROADMAP**

In `ROADMAP.md`:
- Add under **Done**: row for Commesse stats clarity → this plan + spec
- Remove from **Next** if you added a queue line earlier (otherwise skip)

- [ ] **Step 6: Commit**

```bash
git add src/components/OpportunitiesPanel.tsx src/components/panels.module.css ROADMAP.md docs/superpowers/specs/2026-08-07-commesse-stats-clarity-design.md docs/superpowers/plans/2026-08-07-commesse-stats-clarity.md
git commit -m "feat(ui): clarify Commesse stats chips and tooltips"
```

---

## Spec coverage (self-check)

| Spec requirement | Task |
|------------------|------|
| Labeled chips for 5 stats | Task 2 |
| Italian `title` one-liners | Task 2 |
| Coach tip early, Guide flow | Task 1 |
| No new deps / no popover | Global + both |
| Sticky / Δ cassa unchanged | Explicit non-touch |
| Contratti only if count > 0 | Task 2 |
| Success criteria (player understands) | Manual smoke Task 2 |
