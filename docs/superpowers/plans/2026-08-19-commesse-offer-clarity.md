# Commesse offer clarity — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make commessa / appalto PA / contratto distinguishable on the board via badges, inline accept previews, an always-visible active-contracts panel, and offer-type filter — without changing sim formulas.

**Architecture:** Pure copy helpers in `src/ui/opportunityCopy.ts` (tested) classify offers and format Italian strings; `previewContractTerms` reuses the same net/FL math as `acceptAsContract`. `OpportunitiesPanel` consumes helpers for rendering; `boardView.ts` gains an offer-kind filter layer. Coach + wiki guide copy updated separately.

**Tech Stack:** TypeScript, Vitest (node env), React, CSS modules, existing Zustand store unchanged.

## Global Constraints

- Player-facing copy: **Italian**. Code identifiers: English.
- No changes to `maybeMakeContract`, `acceptAsContract` business rules, or `generateOpportunities`.
- No accept confirmation modal.
- Vitest `environment: node` — no RTL; test pure helpers + boardView + coach.
- Run `npm run lint && npm test && npm run build` before PR.
- Guide: edit `docs/wiki/help/*.md`, then `node scripts/sync-guide-pages.mjs` (do not hand-edit `guidePages.ts`).
- Commit only when user asks.

**Spec:** [docs/superpowers/specs/2026-08-19-commesse-offer-clarity-design.md](../specs/2026-08-19-commesse-offer-clarity-design.md)

---

### Task 1: `opportunityCopy` helpers + tests

**Files:**
- Create: `src/ui/opportunityCopy.ts`
- Create: `src/ui/opportunityCopy.test.ts`
- Modify: `src/sim/contracts.ts` (export shared preview helper only)

**Interfaces:**
- Consumes: `Opportunity`, `GameState`, `CONTRACT_WORKFORCE_LOCK`, `workforceRequiredForSale`, supply helpers from existing modules.
- Produces:
  ```ts
  export type OfferKind = "single" | "tender" | "contract";
  export const OFFER_KIND_BADGE: Record<OfferKind, string>;
  export function classifyOffer(op: Opportunity): OfferKind;
  export function saleWorkforceRequired(op: Opportunity): number;
  export function formatOfferMoneyLine(op: Opportunity, game: GameState): string;
  export function formatOfferTimingLine(op: Opportunity): string;
  export function formatAcceptPreview(op: Opportunity, game: GameState): string;
  export function previewContractTerms(state: GameState, op: Opportunity): {
    netPerMonth: number;
    workforceLock: number;
    months: number;
  } | null;
  ```

- [ ] **Step 1: Write failing tests**

```ts
// src/ui/opportunityCopy.test.ts
import { describe, expect, it } from "vitest";
import { createInitialGameState } from "../sim/types";
import {
  classifyOffer,
  formatAcceptPreview,
  formatOfferTimingLine,
  previewContractTerms,
} from "./opportunityCopy";
import type { Opportunity } from "../sim/types";

const baseSale = (over: Partial<Opportunity> = {}): Opportunity => ({
  id: 1,
  kind: "sale",
  title: "Commessa · Rossi · Milano",
  net: 2100,
  expiresInMonths: 1,
  termMonths: 2,
  clientType: "private",
  marketLayer: "local",
  workforceRequired: 25,
  ...over,
});

describe("classifyOffer", () => {
  it("single for local sale without contractMonths", () => {
    expect(classifyOffer(baseSale())).toBe("single");
  });
  it("tender for municipal PA", () => {
    expect(
      classifyOffer(
        baseSale({
          title: "Appalto comunale · Comune di X",
          net: 30000,
          marketLayer: "municipal",
          clientType: "pa",
          termMonths: 12,
        }),
      ),
    ).toBe("tender");
  });
  it("contract when contractMonths >= 2", () => {
    expect(classifyOffer(baseSale({ contractMonths: 3, title: "Contratto · Rossi" }))).toBe(
      "contract",
    );
  });
});

describe("formatOfferTimingLine", () => {
  it("uses Incasso tra for single", () => {
    expect(formatOfferTimingLine(baseSale())).toMatch(/Incasso tra ~2 mesi/);
  });
  it("uses Durata for contract", () => {
    expect(formatOfferTimingLine(baseSale({ contractMonths: 3 }))).toMatch(
      /Durata 3 mesi · fattura ogni mese/,
    );
  });
  it("PA suffix for tender", () => {
    expect(
      formatOfferTimingLine(
        baseSale({ marketLayer: "municipal", clientType: "pa", termMonths: 12 }),
      ),
    ).toMatch(/PA, pagamenti lunghi/);
  });
});

describe("formatAcceptPreview", () => {
  it("single mentions one invoice and FL this month", () => {
    const s = createInitialGameState();
    expect(formatAcceptPreview(baseSale(), s)).toMatch(
      /Se accetti: 1 fattura · incasso tra ~2 mesi · −25 FL questo mese/,
    );
  });
  it("contract mentions monthly invoices and locked FL", () => {
    const s = createInitialGameState();
    const op = baseSale({ contractMonths: 3, net: 3000, workforceRequired: 30 });
    expect(formatAcceptPreview(op, s)).toMatch(/3 fatture da/);
    expect(formatAcceptPreview(op, s)).toMatch(/FL bloccate fino a chiusura/);
    expect(formatAcceptPreview(op, s)).toMatch(/max 2 contratti attivi/);
  });
});

describe("previewContractTerms", () => {
  it("matches acceptAsContract netPerMonth without warehouse bonus", () => {
    const s = createInitialGameState();
    const op = baseSale({ contractMonths: 3, net: 3000 });
    expect(previewContractTerms(s, op)?.netPerMonth).toBe(1000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/ui/opportunityCopy.test.ts`  
Expected: FAIL — module `./opportunityCopy` not found.

- [ ] **Step 3: Implement helpers**

Extract preview math into `contracts.ts`:

```ts
// Add to src/sim/contracts.ts (export, no behaviour change)
export const computeContractTerms = (
  state: GameState,
  op: Opportunity,
): { netPerMonth: number; workforceLock: number; months: number } | null => {
  if (!op.contractMonths || op.contractMonths < 2) return null;
  const months = op.contractMonths;
  let baseNet = round2(op.net / months);
  if (op.qualityRequired && !meetsQualityDemand(state, op.qualityRequired)) {
    // penalty applied at accept; preview uses undiscounted net
  } else if (bestWarehouseQuality(state) != null) {
    baseNet = applySupplyToSaleNet(state, baseNet).net;
  }
  const fl =
    op.workforceRequired ??
    workforceRequiredForSale(op.net, {
      marketLayer: op.marketLayer,
      termMonths: op.termMonths ?? op.contractMonths ?? months,
    });
  return {
    netPerMonth: baseNet,
    workforceLock: Math.max(CONTRACT_WORKFORCE_LOCK, Math.round(fl * 0.6)),
    months,
  };
};
```

Refactor `acceptAsContract` to call `computeContractTerms` instead of inlining (same outputs).

Implement `opportunityCopy.ts` with `classifyOffer`, formatting functions, and `saleWorkforceRequired` wrapper.

- [ ] **Step 4: Run tests**

Run: `npm test -- src/ui/opportunityCopy.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit** (only if user asked)

---

### Task 2: Offer-kind filter in `boardView`

**Files:**
- Modify: `src/sim/boardView.ts`
- Modify: `src/sim/boardView.test.ts`

**Interfaces:**
- Consumes: `classifyOffer` from `src/ui/opportunityCopy.ts`
- Produces:
  ```ts
  export type OfferKindFilter = "all" | "single" | "contract" | "tender";
  export const OFFER_KIND_FILTER_LABEL: Record<OfferKindFilter, string>;
  export const nextOfferKindFilter: (f: OfferKindFilter) => OfferKindFilter;
  export const visibleOpportunities(
    ops: readonly Opportunity[],
    filter: BoardFilter,
    market?: MarketFilter,
    offerKind?: OfferKindFilter,
  ): Opportunity[];
  ```

- [ ] **Step 1: Add failing tests**

```ts
// Append to boardView.test.ts
import { classifyOffer } from "../ui/opportunityCopy"; // only if needed for fixtures

const local = { ...op(2, "sale", 1200), marketLayer: "local" as const };
const municipal = {
  ...op(3, "sale", 30000),
  marketLayer: "municipal" as const,
  clientType: "pa" as const,
};
const contract = { ...local, id: 4, contractMonths: 3 };

it("offer kind filter: contracts only", () => {
  const board = [local, municipal, contract];
  expect(visibleOpportunities(board, "in", "all", "contract").map((o) => o.id)).toEqual([4]);
});

it("offer kind ignored when board filter is out (supplies only)", () => {
  const board = [op(1, "supply", 800), contract];
  expect(visibleOpportunities(board, "out", "all", "contract").map((o) => o.id)).toEqual([1]);
});

it("cycles offer kind filter", () => {
  expect(nextOfferKindFilter("all")).toBe("single");
  expect(nextOfferKindFilter("tender")).toBe("all");
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npm test -- src/sim/boardView.test.ts`

- [ ] **Step 3: Implement filter in `visibleOpportunities`**

After market filter, if `offerKind !== "all"` and `filter !== "out"`, keep sales where `classifyOffer(o) === offerKind`. Supplies unchanged when `filter === "out"`.

- [ ] **Step 4: Run tests — expect PASS**

Run: `npm test -- src/sim/boardView.test.ts`

---

### Task 3: `OpportunitiesPanel` UI

**Files:**
- Modify: `src/components/OpportunitiesPanel.tsx`
- Modify: `src/components/panels.module.css`

- [ ] **Step 1: CSS additions**

```css
.dealHead {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.dealBadge { /* extend .badge sizing */ }
.dealBadgeSingle { color: var(--color-text-muted); background: var(--color-surface-elevated, #f4f4f5); }
.dealBadgeTender { color: var(--color-warning, #b45309); background: rgba(180, 83, 9, 0.12); }
.dealBadgeContract { color: var(--color-accent); background: var(--color-accent-soft); }

.dealOutcome {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--color-text-muted);
  line-height: 1.4;
}

.contractList {
  margin: 8px 0 12px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}

.contractListTitle {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
  margin: 0 0 6px;
}

.contractRow {
  font-size: 13px;
  color: var(--color-text);
  margin: 4px 0;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 2: Wire panel**

In `OpportunitiesPanel.tsx`:

1. Import helpers from `opportunityCopy`, `OFFER_KIND_FILTER_LABEL`, `nextOfferKindFilter`, `OfferKindFilter` from `boardView`.
2. State: `const [offerKind, setOfferKind] = useState<OfferKindFilter>("all")`.
3. Third filter button in `panelHead` (hidden or disabled when `filter === "out"` — optional title explains).
4. Pass `offerKind` to `visibleOpportunities`.
5. Stat chip: always `Contratti {n}/2` with updated tooltip.
6. Insert `contractList` block after `statChips`, before muted paragraph.
7. For each sale in `visible.map`: render badge + three lines via helpers; supplies keep current meta.

Example card fragment:

```tsx
{op.kind === "sale" ? (
  <>
    <div className={styles.dealHead}>
      <h3 className={styles.dealTitle}>{op.title}</h3>
      <span className={`${styles.dealBadge} ${styles[`dealBadge${kindKey}`]}`} title={...}>
        {OFFER_KIND_BADGE[kind]}
      </span>
    </div>
    <p className={styles.dealMeta}>{formatOfferMoneyLine(op, game)}</p>
    <p className={styles.dealMeta}>{formatOfferTimingLine(op)}</p>
    <p className={styles.dealOutcome}>{formatAcceptPreview(op, game)}</p>
  </>
) : (
  /* existing supply block */
)}
```

- [ ] **Step 3: Manual smoke**

Run: `npm run dev` — verify badges, preview lines, contract panel empty and with 1–2 active contracts.

- [ ] **Step 4: Lint**

Run: `npm run lint`

---

### Task 4: Coach tips

**Files:**
- Modify: `src/ui/coach.ts`
- Modify: `src/ui/coach.test.ts`

- [ ] **Step 1: Add failing test**

```ts
it("shows offer-types when board has contract and monthsPlayed 2–4", () => {
  const s = createInitialGameState();
  s.monthsPlayed = 2;
  s.liabilities = [];
  s.opportunities = [
    {
      id: 1,
      kind: "sale",
      title: "Contratto · Demo",
      net: 3000,
      expiresInMonths: 1,
      termMonths: 1,
      contractMonths: 3,
      marketLayer: "local",
    },
  ];
  expect(coachTipFor(s)?.id).toBe("offer-types");
});
```

- [ ] **Step 2: Implement tip** (priority after F24, before or instead of `commesse-legend` when contract on board):

```ts
const hasContractOffer = game.opportunities.some(
  (o) => o.kind === "sale" && (o.contractMonths ?? 0) >= 2,
);
if (
  game.monthsPlayed >= 2 &&
  game.monthsPlayed <= 4 &&
  hasContractOffer
) {
  return {
    id: "offer-types",
    title: "Tre tipi di offerta",
    body: "Singola = una fattura e incasso tra pochi mesi. Appalto PA = una fattura grossa ma incasso lento. Contratto = fatture ogni mese per più mesi e FL bloccata: guarda il badge e la riga «Se accetti».",
  };
}
```

Update `commesse-legend` body to mention badge + «Contratti in corso».

- [ ] **Step 3: Run coach tests**

Run: `npm test -- src/ui/coach.test.ts`

---

### Task 5: Wiki + guide sync

**Files:**
- Modify: `docs/wiki/help/come-si-gioca.md` — new section `## Tipi di offerta`
- Modify: `docs/wiki/help/faq.md` — new FAQ `## Commessa, appalto o contratto?`
- Run: `node scripts/sync-guide-pages.mjs` → updates `src/content/guidePages.ts`

**Copy sketch (Italian):**

**come-si-gioca.md** — after reputation paragraph:

```markdown
## Tipi di offerta

Sul tabellone ogni vendita ha un **badge**:

- **Singola** — una fattura; incassi tra pochi mesi; FL solo nel mese in cui accetti.
- **Appalto PA** — una fattura grande; incassi tardi (6–36 mesi); serve reputazione comunale/nazionale.
- **Contratto** — fattura ogni mese per 3 mesi; parte della FL resta **bloccata** fino alla chiusura (max 2 attivi). Leggi la riga «Se accetti» sulla card.

Sotto i numeri vedi **Contratti in corso (n/2)** con cosa hai già firmato.
```

**faq.md** — new entry explaining «12 mesi» (incasso) vs «Contratto 3 mesi» (durata lavoro).

- [ ] Run sync script and verify `guidePages.ts` updated.

---

### Task 6: Verification gate

- [ ] Run: `npm run lint && npm test && npm run build`  
  Expected: all green.

- [ ] Update `ROADMAP.md` Next line: `Commesse offer clarity — in PR #N` (when PR opened).

---

## Plan self-review

| Spec requirement | Task |
|------------------|------|
| classifyOffer + copy helpers | Task 1 |
| Card badge + 3 lines + preview | Task 3 |
| Active contracts panel + n/2 chip | Task 3 |
| Offer-type filter | Task 2 + Task 3 |
| Coach offer-types + legend update | Task 4 |
| Guide/wiki | Task 5 |
| No sim formula changes | Global constraints |
| Vitest coverage | Tasks 1, 2, 4 |

No placeholders remain. `computeContractTerms` refactor keeps accept path identical.

## Execution handoff

Plan saved to `docs/superpowers/plans/2026-08-19-commesse-offer-clarity.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — implement in this session task-by-task with checkpoints

Which approach do you prefer?
