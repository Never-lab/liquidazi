# UI clarity + hybrid tooltips — Design

**Date:** 2026-08-08  
**Status:** Approved (brainstorming)  
**Goal:** Across the full product UI, no control should be mute or easy to misread: disabled/non-obvious actions explain *why* and *what to do next*. Critical controls use a tap-friendly `Hint`; secondary info uses native `title` / `aria-label`. Code comments only on touched UI, explaining non-obvious disable rules.

## Locked decisions

| Decision | Choice |
|----------|--------|
| Surface scope | **C** — all product UI: in-game panels + HUD, menu, setup, intro/tutorial, saves, auth, end, guide, feedback, leaderboard, admin |
| Code comments | **A** — only on UI we touch (why disabled / rule), not repo-wide JSDoc |
| Tooltip mechanism | **C** — hybrid: native `title`/`aria-*` broadly; custom `Hint` only on critical controls |
| Sim rules | Unchanged (no cost/cooldown/formula changes in this work) |
| Delivery | Multiple PRs by area (foundation → high-risk in-game → rest in-game → out-of-game → admin) |

## Approach (chosen)

**Catalog + hybrid Hint**, not “tooltip on every pixel” and not “title-only”.

1. Inventory every interactive control per screen/panel.
2. Classify: critical → `Hint`; secondary → `title` (+ visible label if needed); obvious labeled button → optional `aria-label` only if icon-only.
3. Ship in slices with lint/test/build green each PR.

## Component: `Hint`

**Location:** `src/components/ui/Hint.tsx` (+ styles in existing `ui.module.css` or colocated module).

**API (minimal):**

```tsx
<Hint text="Prossimo CAPEX tra 3 mesi — avanza il calendario">
  <button disabled>…</button>
</Hint>
```

| Prop | Type | Notes |
|------|------|--------|
| `text` | `string` | Italian, ≤ ~2 short sentences |
| `children` | `ReactNode` | Single focusable/control tree |
| `side` | `"top" \| "bottom"` | Optional; default `top` |

**Behavior:**

- Desktop: open on hover/focus; close on mouseleave/blur.
- Mobile: tap wrapper toggles open; tap outside or Esc closes.
- At most one open popover (simple document listener / local coordination is enough for v1).
- A11y: popover referenced via `aria-describedby`; wrapper remains activatable so disabled children can still expose the reason on tap.
- No new npm dependencies.

**When to use what:**

| Situation | Tool |
|-----------|------|
| Critical control (list below) | `Hint` |
| Secondary chip / already clear metric | `title` (+ label if helpful) |
| Icon-only | `aria-label` required |
| Enabled, self-explanatory text | nothing |

## Critical controls → must use `Hint`

- Advance month when blocked
- Holding CAPEX (cooldown / cash / listed)
- Project offer accept when unaffordable
- Upgrade buy when unaffordable / maxed
- Loan offer when refused
- F24 pay when blocked (collection)
- HUD chips: capacity, reputation, rival pressure, quarterly pressure (where not already crystal-clear)
- Investments deposit/growth/withdraw when disabled
- Admin destructive actions (delete run, wipe, install tester save if risky)

## Copy rules (Italian)

1. Max ~2 short sentences.
2. If blocked: **why** + **what to do** (e.g. cash amount needed, months to wait, open cartella).
3. Avoid unexplained English jargon; terms already on the button (CAPEX) may stay with a short gloss in the hint if needed.
4. Same didactic tone as Guida — educational, not legal advice.

## Code comments (touched UI only)

One short comment above a disable/`Hint` only when the rule is not obvious from the user-facing string (e.g. dual gate: listed *or* cooldown).

## PR slices

| PR | Scope |
|----|--------|
| **1** | `Hint` component + copy conventions note + one smoke wiring (e.g. CAPEX or Avanti) |
| **2** | Holding, Investments, Loan, Tax, Upgrades, Opportunities, GameHUD chips/Avanti |
| **3** | Payroll, Schedule, Report, EventChoice, ProjectOffer, DemandPopup, Coach, NotificationInbox |
| **4** | Menu, Setup, Intro, Tutorial, Saves, Auth, End, Guide, Feedback, Leaderboard |
| **5** | AdminScreen destructive / opaque actions |

Each PR: `npm run lint && npm test && npm run build` green; no sim rule changes.

## Inventory (surfaces)

**In-game panels:** Holding, Investments, Loan, Tax, Upgrades, Opportunities, Payroll, Schedule, Report, Charts (aria), CloudSavePill, Toast, CoachBanner, DemandPopup, EventChoiceBanner, ProjectOfferBanner, NotificationInbox, ConfirmDialog, Sheet, Button.

**Screens:** GameHUD, Menu, Setup, Intro, Tutorial, Saves, Auth, End, Guide, Feedback, Leaderboard, Admin.

Exact per-control checklist lives in the implementation plan (writing-plans), not duplicated here as a frozen table.

## Out of scope

- i18n framework / multi-language
- Visual redesign / new brand system
- Changing CAPEX cooldown, loan formulas, F24 rules, yields
- Commenting `sim/`, `store/`, `server/` wholesale
- Tooltip on every static paragraph

## Done when

- Every disabled control in shipped slices exposes a readable reason (label and/or `Hint`/`title`).
- All critical controls in shipped slices use `Hint` and work on tap (manual or Playwright smoke where practical).
- No mute icon-only controls without `aria-label` in shipped slices.
- Lint, tests, and build pass per PR.
- Design restraint: no tip spam on obvious primary actions.

## Self-review

- No TBDs left for locked decisions.
- Scope C + comments A + hybrid C consistent across sections.
- PR 1 foundation unblocks the rest; CAPEX clarity already partially landed separately — PR 2 may adopt `Hint` on that button without changing rules.
