# UI Clarity + Hybrid Tooltips Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full-product UI clarity: every non-obvious/disabled control explains why and what to do; critical controls use tap-friendly `Hint`; secondary use `title`/`aria-label`; comments only on touched UI.

**Architecture:** Thin presentational `Hint` wrapper (hover/focus/tap). Pure Italian copy helpers in `src/ui/controlHints.ts` (unit-tested in node Vitest — no RTL). Wire helpers + `Hint` across panels/screens in PR-sized tasks. No sim rule changes.

**Tech Stack:** React 19, TypeScript, CSS modules (`ui.module.css`), Vitest (node env), existing `Button`/`ConfirmDialog` patterns. No new npm deps.

**Spec:** `docs/superpowers/specs/2026-08-08-ui-clarity-tooltips-design.md`

## Global Constraints

- Scope C: all product UI (in-game + menu/auth/guide/admin/end/…)
- Comments A: only on touched UI, why-disable notes
- Hybrid C: `Hint` for critical list; `title`/`aria-label` elsewhere
- No sim formula/cost/cooldown changes
- Italian copy ≤ ~2 short sentences; blocked = why + what to do
- No new npm dependencies
- Each task ends with `npm run lint && npm test && npm run build` green before commit
- Prefer one commit per task

## File map

| File | Role |
|------|------|
| `src/components/ui/Hint.tsx` | Presentational Hint (hover/focus/tap) |
| `src/components/ui/ui.module.css` | `.hintWrap`, `.hintBubble` styles |
| `src/ui/controlHints.ts` | Pure functions → Italian hint strings |
| `src/ui/controlHints.test.ts` | Vitest coverage for copy helpers |
| `src/components/HoldingPanel.tsx` | Wrap CAPEX (+ buy if muted disable) |
| `src/components/InvestmentsPanel.tsx` | Deposit / withdraw / growth |
| `src/components/LoanPanel.tsx` | Offer / custom / fido disables |
| `src/components/TaxPanel.tsx` | Paga F24 |
| `src/components/UpgradesPanel.tsx` | Acquista/Potenzia |
| `src/components/OpportunitiesPanel.tsx` | Ensure chips have titles; icon actions |
| `src/screens/GameHUD.tsx` | Chiudi mese + cash/F24/scorte/rep titles |
| `src/components/ProjectOfferBanner.tsx` | Accetta when !canAfford |
| `src/components/PayrollPanel.tsx` | Hire/fire/disabled + morale |
| `src/components/SchedulePanel.tsx` | Opaque actions |
| `src/components/ReportPanel.tsx` | Opaque metrics |
| `src/components/EventChoiceBanner.tsx` | Choice buttons if gated |
| `src/components/DemandPopup.tsx` | Close already labeled |
| `src/components/CoachBanner.tsx` | Dismiss if any |
| `src/components/NotificationInbox.tsx` | Bell aria |
| Screens PR4 | Menu, Setup, Intro, Tutorial, Saves, Auth, End, Guide, Feedback, Leaderboard |
| `src/screens/AdminScreen.tsx` | Delete run, install tester |
| `ROADMAP.md` | Mark clarity pass when last slice ships |
| Spec (already) | `docs/superpowers/specs/2026-08-08-ui-clarity-tooltips-design.md` |

---

### Task 1: `Hint` component + styles

**Files:**
- Create: `src/components/ui/Hint.tsx`
- Modify: `src/components/ui/ui.module.css`
- Create: `src/ui/hintOpen.test.ts` (pure reducer for open/close — no DOM)

**Interfaces:**
- Consumes: React, `ui.module.css`
- Produces:
  - `Hint({ text, children, side?: "top" | "bottom" })`
  - `export type HintOpenAction = { type: "open" } | { type: "close" } | { type: "toggle" }`
  - `export const hintOpenReducer = (open: boolean, action: HintOpenAction): boolean`

- [ ] **Step 1: Write the failing reducer test**

Create `src/ui/hintOpen.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { hintOpenReducer } from "./hintOpen";

describe("hintOpenReducer", () => {
  it("opens, closes, toggles", () => {
    expect(hintOpenReducer(false, { type: "open" })).toBe(true);
    expect(hintOpenReducer(true, { type: "close" })).toBe(false);
    expect(hintOpenReducer(false, { type: "toggle" })).toBe(true);
    expect(hintOpenReducer(true, { type: "toggle" })).toBe(false);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL (module missing)**

Run: `npx vitest run src/ui/hintOpen.test.ts`  
Expected: FAIL cannot find module `./hintOpen`

- [ ] **Step 3: Implement reducer + Hint**

Create `src/ui/hintOpen.ts`:

```ts
export type HintOpenAction = { type: "open" } | { type: "close" } | { type: "toggle" };

export const hintOpenReducer = (open: boolean, action: HintOpenAction): boolean => {
  if (action.type === "open") return true;
  if (action.type === "close") return false;
  return !open;
};
```

Create `src/components/ui/Hint.tsx`:

```tsx
import {
  useEffect,
  useId,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import { hintOpenReducer } from "../../ui/hintOpen";
import styles from "./ui.module.css";

type Props = {
  text: string;
  children: ReactNode;
  side?: "top" | "bottom";
};

export const Hint = ({ text, children, side = "top" }: Props) => {
  const [open, dispatch] = useReducer(hintOpenReducer, false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        dispatch({ type: "close" });
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dispatch({ type: "close" });
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span
      ref={wrapRef}
      className={styles.hintWrap}
      onMouseEnter={() => dispatch({ type: "open" })}
      onMouseLeave={() => dispatch({ type: "close" })}
      onFocusCapture={() => dispatch({ type: "open" })}
      onBlurCapture={(e) => {
        if (!wrapRef.current?.contains(e.relatedTarget as Node)) {
          dispatch({ type: "close" });
        }
      }}
      onClick={(e) => {
        // Tap on wrapper (incl. when child is disabled) toggles for mobile.
        if ((e.target as HTMLElement).closest("button,a,input")) {
          const btn = (e.target as HTMLElement).closest("button");
          if (btn?.disabled) {
            e.preventDefault();
            dispatch({ type: "toggle" });
          }
          return;
        }
        dispatch({ type: "toggle" });
      }}
    >
      <span aria-describedby={open ? descId : undefined}>{children}</span>
      {open && (
        <span
          id={descId}
          role="tooltip"
          className={`${styles.hintBubble} ${side === "bottom" ? styles.hintBottom : styles.hintTop}`}
        >
          {text}
        </span>
      )}
    </span>
  );
};
```

Append to `src/components/ui/ui.module.css`:

```css
.hintWrap {
  position: relative;
  display: inline-flex;
  max-width: 100%;
  vertical-align: middle;
}

.hintBubble {
  position: absolute;
  z-index: 40;
  left: 50%;
  transform: translateX(-50%);
  width: max-content;
  max-width: min(280px, 80vw);
  padding: 8px 10px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-strong);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.35;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
  pointer-events: none;
}

.hintTop {
  bottom: calc(100% + 6px);
}

.hintBottom {
  top: calc(100% + 6px);
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npx vitest run src/ui/hintOpen.test.ts`  
Expected: PASS

- [ ] **Step 5: Lint/build smoke**

Run: `npm run lint && npx tsc -b --pretty false`  
Expected: no errors from new files

- [ ] **Step 6: Commit**

```bash
git add src/ui/hintOpen.ts src/ui/hintOpen.test.ts src/components/ui/Hint.tsx src/components/ui/ui.module.css
git commit -m "feat(ui): add Hint wrapper with open-state reducer"
```

---

### Task 2: `controlHints` pure copy helpers + tests

**Files:**
- Create: `src/ui/controlHints.ts`
- Create: `src/ui/controlHints.test.ts`

**Interfaces:**
- Consumes: none from React; optional `formatCash` from `src/components/formatCash.ts`
- Produces (exact names later tasks import):

```ts
export const monthCloseHint = (opts: {
  pendingEvent: boolean;
  pendingProjectOffer: boolean;
}): string | null;

export const capexHint = (opts: {
  listed: boolean;
  cooldownMonths: number;
  shortCash: boolean;
  costLabel: string; // already formatted €
}): string;

export const f24PayHint = (opts: {
  dueNow: number;
  blocked: boolean;
}): string;

export const upgradeBuyHint = (opts: {
  atMax: boolean;
  shortCash: boolean;
  costLabel: string;
}): string;

export const treasuryDepositHint = (opts: {
  belowMin: boolean;
  shortCash: boolean;
  minLabel: string;
}): string;

export const treasuryWithdrawHint = (opts: {
  invalidAmount: boolean;
  overBalance: boolean;
}): string;

export const growthInvestHint = (opts: {
  belowMin: boolean;
  shortCash: boolean;
  atCap: boolean;
  minLabel: string;
}): string;

export const projectOfferAcceptHint = (canAfford: boolean): string | null;

export const loanOfferHint = (disabledReason: string | null): string | null;
```

- [ ] **Step 1: Write failing tests**

Create `src/ui/controlHints.test.ts` with cases covering each helper (blocked why + next step). Minimum cases:

```ts
import { describe, expect, it } from "vitest";
import {
  capexHint,
  f24PayHint,
  monthCloseHint,
  upgradeBuyHint,
} from "./controlHints";

describe("monthCloseHint", () => {
  it("null when free", () => {
    expect(monthCloseHint({ pendingEvent: false, pendingProjectOffer: false })).toBeNull();
  });
  it("event first", () => {
    expect(
      monthCloseHint({ pendingEvent: true, pendingProjectOffer: true }),
    ).toMatch(/evento/i);
  });
  it("project when only offer", () => {
    expect(
      monthCloseHint({ pendingEvent: false, pendingProjectOffer: true }),
    ).toMatch(/progetto|investimenti/i);
  });
});

describe("capexHint", () => {
  it("listed beats cooldown", () => {
    expect(
      capexHint({
        listed: true,
        cooldownMonths: 3,
        shortCash: true,
        costLabel: "6.000 €",
      }),
    ).toMatch(/vendita/i);
  });
  it("cooldown explains wait", () => {
    expect(
      capexHint({
        listed: false,
        cooldownMonths: 4,
        shortCash: false,
        costLabel: "6.000 €",
      }),
    ).toMatch(/4/);
  });
  it("short cash names amount", () => {
    expect(
      capexHint({
        listed: false,
        cooldownMonths: 0,
        shortCash: true,
        costLabel: "6.000 €",
      }),
    ).toMatch(/6\.000/);
  });
});

describe("f24PayHint", () => {
  it("blocked by collection", () => {
    expect(f24PayHint({ dueNow: 100, blocked: true })).toMatch(/riscossione|cartella/i);
  });
  it("nothing due", () => {
    expect(f24PayHint({ dueNow: 0, blocked: false })).toMatch(/nessun|dovuto/i);
  });
});

describe("upgradeBuyHint", () => {
  it("at max", () => {
    expect(
      upgradeBuyHint({ atMax: true, shortCash: false, costLabel: "1 €" }),
    ).toMatch(/massimo|Lv3|livello/i);
  });
  it("short cash", () => {
    expect(
      upgradeBuyHint({ atMax: false, shortCash: true, costLabel: "5.000 €" }),
    ).toMatch(/5\.000|cassa/i);
  });
});
```

Add analogous tests for treasury/growth/project/loan in the same file.

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run src/ui/controlHints.test.ts`  
Expected: FAIL module missing

- [ ] **Step 3: Implement helpers**

Create `src/ui/controlHints.ts` implementing all exported functions with Italian copy matching the tests. Priority order for `capexHint`: listed → cooldown → shortCash → ready gloss (`Investi … → +16% EBITDA; poi 6 mesi di attesa`).

Example bodies:

```ts
export const monthCloseHint = (opts: {
  pendingEvent: boolean;
  pendingProjectOffer: boolean;
}): string | null => {
  if (opts.pendingEvent) return "Risolvi prima l'evento in corso, poi potrai chiudere il mese.";
  if (opts.pendingProjectOffer) {
    return "Scegli o salta il piano investimenti (offerta progetto), poi chiudi il mese.";
  }
  return null;
};

export const capexHint = (opts: {
  listed: boolean;
  cooldownMonths: number;
  shortCash: boolean;
  costLabel: string;
}): string => {
  if (opts.listed) return "CAPEX non disponibile mentre la partecipata è in vendita.";
  if (opts.cooldownMonths > 0) {
    return `Prossimo CAPEX tra ${opts.cooldownMonths} mesi — avanza il calendario.`;
  }
  if (opts.shortCash) return `Cassa insufficiente (servono ${opts.costLabel}).`;
  return `Investi ${opts.costLabel} → +16% EBITDA; poi 6 mesi di attesa.`;
};

export const f24PayHint = (opts: { dueNow: number; blocked: boolean }): string => {
  if (opts.blocked) {
    return "F24 bloccato: gestisci prima il debito in riscossione (cartella / pignoramento).";
  }
  if (opts.dueNow <= 0) return "Nessun importo F24 dovuto in questo momento.";
  return "Paga i debiti F24 scaduti per evitare mora e cartella.";
};

export const upgradeBuyHint = (opts: {
  atMax: boolean;
  shortCash: boolean;
  costLabel: string;
}): string => {
  if (opts.atMax) return "Livello massimo (Lv3) già raggiunto per questo upgrade.";
  if (opts.shortCash) return `Cassa insufficiente (servono ${opts.costLabel}).`;
  return `Acquista / potenzia per ${opts.costLabel}.`;
};

export const treasuryDepositHint = (opts: {
  belowMin: boolean;
  shortCash: boolean;
  minLabel: string;
}): string => {
  if (opts.belowMin) return `Deposito minimo ${opts.minLabel}.`;
  if (opts.shortCash) return "Cassa insufficiente per questo deposito.";
  return "Sposta liquidità in tesoreria (interessi, non comfort).";
};

export const treasuryWithdrawHint = (opts: {
  invalidAmount: boolean;
  overBalance: boolean;
}): string => {
  if (opts.invalidAmount) return "Indica un importo da prelevare maggiore di zero.";
  if (opts.overBalance) return "Non puoi prelevare più del saldo tesoreria.";
  return "Riporta fondi dalla tesoreria alla cassa.";
};

export const growthInvestHint = (opts: {
  belowMin: boolean;
  shortCash: boolean;
  atCap: boolean;
  minLabel: string;
}): string => {
  if (opts.atCap) return "Tetto crescita raggiunto (+3 slot).";
  if (opts.belowMin) return `Investimento minimo ${opts.minLabel} per uno slot.`;
  if (opts.shortCash) return "Cassa insufficiente per questo investimento crescita.";
  return "Reinvesti in capacità (+1 slot vendita).";
};

export const projectOfferAcceptHint = (canAfford: boolean): string | null =>
  canAfford ? null : "Cassa insufficiente per accettare questo progetto.";

export const loanOfferHint = (disabledReason: string | null): string | null =>
  disabledReason;
```

- [ ] **Step 4: Run tests — PASS**

Run: `npx vitest run src/ui/controlHints.test.ts`  
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/controlHints.ts src/ui/controlHints.test.ts
git commit -m "feat(ui): add Italian control hint copy helpers"
```

---

### Task 3: Wire high-risk in-game (PR slice 2)

**Files:**
- Modify: `HoldingPanel.tsx`, `InvestmentsPanel.tsx`, `LoanPanel.tsx`, `TaxPanel.tsx`, `UpgradesPanel.tsx`, `OpportunitiesPanel.tsx`, `GameHUD.tsx`, `ProjectOfferBanner.tsx`

**Interfaces:**
- Consumes: `Hint`, helpers from Task 2, existing disable booleans
- Produces: critical disables wrapped in `<Hint text={…}>`; HUD `Chiudi mese` uses `monthCloseHint`; secondary chips keep/extend `title`

**Per-control checklist (must all be done):**

| Control | Tool | Hint source |
|---------|------|-------------|
| Holding CAPEX | `Hint` | `capexHint` (reuse existing label logic) |
| Holding Acquista (no cash / no slot) | `Hint` or strong `title` | inline Italian |
| Investments Deposita / Preleva / Investi | `Hint` | treasury*/growth* |
| Loan Accetta when `disabledReason` | `Hint` | `loanOfferHint` |
| Loan custom / fido disables | `Hint` or `title` | why + cap |
| Tax Paga F24 | `Hint` | `f24PayHint` |
| Upgrades buy | `Hint` | `upgradeBuyHint` |
| Project offer Accetta | `Hint` | `projectOfferAcceptHint` when !canAfford |
| GameHUD Chiudi mese | `Hint` when blocked | `monthCloseHint` |
| GameHUD cassa / F24 / scorte / rep line | `title` | short didactic |
| Opportunities chips | `title` (already mostly) | fill gaps only |

- [ ] **Step 1: Holding CAPEX — wrap with Hint**

In `HoldingPanel.tsx`, import `Hint` and `capexHint`. Replace button `title={capexReason}` with:

```tsx
<Hint text={capexHint({
  listed,
  cooldownMonths: s.capexCooldownMonths,
  shortCash,
  costLabel: formatCash(capexCost),
})}>
  <button
    className={styles.buttonSecondary}
    disabled={capexBlocked}
    onClick={() => capex(s.id)}
  >
    {capexLabel}
  </button>
</Hint>
```

Keep a one-line comment if dual-gate (listed vs cooldown) remains non-obvious.

For board **Acquista** when disabled:

```tsx
const buyBlockedReason =
  subs.length >= cap
    ? `Slot holding pieni (${subs.length}/${cap}).`
    : game.company.cash < t.price
      ? `Cassa insufficiente (servono ${formatCash(t.price)}).`
      : null;
// wrap button in Hint when buyBlockedReason, else bare button
```

- [ ] **Step 2: Investments / Loan / Tax / Upgrades / ProjectOffer / GameHUD**

Same pattern: compute reason → if blocked (or always for critical enabled gloss), wrap with `Hint text={…}`.

GameHUD example:

```tsx
const closeHint = monthCloseHint({
  pendingEvent: Boolean(pending),
  pendingProjectOffer: Boolean(pendingProjectOffer),
});
// …
{closeHint ? (
  <Hint text={closeHint}>
    <Button … disabled={monthBlocked}>…</Button>
  </Hint>
) : (
  <Button …>…</Button>
)}
```

Add `title` on cassa/F24 stats if missing, e.g. cassa: `"Liquidità disponibile per spese e opportunità."`, F24: `"Debiti F24 aperti (scadenza didattica il 16)."`

- [ ] **Step 3: Verify**

Run: `npm run lint && npm test && npm run build`  
Expected: all green

- [ ] **Step 4: Commit**

```bash
git add src/components/HoldingPanel.tsx src/components/InvestmentsPanel.tsx \
  src/components/LoanPanel.tsx src/components/TaxPanel.tsx \
  src/components/UpgradesPanel.tsx src/components/OpportunitiesPanel.tsx \
  src/components/ProjectOfferBanner.tsx src/screens/GameHUD.tsx
git commit -m "feat(ui): wire Hint on high-risk in-game controls"
```

---

### Task 4: Rest of in-game surfaces (PR slice 3)

**Files:**
- Modify: `PayrollPanel.tsx`, `SchedulePanel.tsx`, `ReportPanel.tsx`, `EventChoiceBanner.tsx`, `DemandPopup.tsx`, `CoachBanner.tsx`, `NotificationInbox.tsx`, `CloudSavePill.tsx` (if opaque), `Charts.tsx` (aria only if missing)

**Checklist:**

| Surface | Action |
|---------|--------|
| Payroll | Every hire/fire/disabled control: `title` or `Hint` with why |
| Schedule | Opaque buttons/rows get `title` |
| Report | Metric labels that look like controls get `title` |
| EventChoice | Choices already labeled; add `title` only if cost/gate |
| DemandPopup | Ensure close has `aria-label` (likely done) |
| CoachBanner | Dismiss control labeled |
| NotificationInbox | Bell already has aria — verify Italian clarity |
| Charts | Keep/extend `aria-label` on SVG |

- [ ] **Step 1: Audit each file for `disabled=` and icon-only buttons; fix gaps**

Use repo search: `disabled=` under `src/components`. For each hit without reason, add `Hint`/`title`.

- [ ] **Step 2: Verify + commit**

Run: `npm run lint && npm test && npm run build`

```bash
git add src/components/PayrollPanel.tsx src/components/SchedulePanel.tsx \
  src/components/ReportPanel.tsx src/components/EventChoiceBanner.tsx \
  src/components/DemandPopup.tsx src/components/CoachBanner.tsx \
  src/components/NotificationInbox.tsx src/components/CloudSavePill.tsx \
  src/components/Charts.tsx
git commit -m "feat(ui): clarify remaining in-game panel controls"
```

(Only stage files actually changed.)

---

### Task 5: Out-of-game screens (PR slice 4)

**Files:**
- Modify as needed: `MenuScreen.tsx`, `SetupScreen.tsx`, `IntroScreen.tsx`, `TutorialScreen.tsx`, `SavesScreen.tsx`, `AuthScreen.tsx`, `EndScreen.tsx`, `GuideScreen.tsx`, `FeedbackScreen.tsx`, `LeaderboardScreen.tsx`

**Checklist:**

| Screen | Focus |
|--------|-------|
| Setup | City empty → `title` why start disabled |
| Auth | Busy disables → `title` “Attendi…”; password toggle already aria |
| Saves | Slot actions + confirm dialog titles |
| Menu / End / Leaderboard | Nav links clear; destructive confirms already use ConfirmDialog |
| Intro / Tutorial | CTA clarity |
| Guide | Nav `aria-label` already — ensure chapter buttons clear |
| Feedback | Submit busy → title |

- [ ] **Step 1: Wire disables + icon-only gaps**

Setup example:

```tsx
title={cityOptions.length === 0 ? "Nessun comune per questo settore — cambia settore." : undefined}
```

- [ ] **Step 2: Verify + commit**

Run: `npm run lint && npm test && npm run build`

```bash
git add src/screens/*.tsx
git commit -m "feat(ui): clarify menu, auth, setup, and other out-of-game screens"
```

---

### Task 6: Admin + ROADMAP (PR slice 5)

**Files:**
- Modify: `src/screens/AdminScreen.tsx`
- Modify: `ROADMAP.md`

**Checklist:**

| Control | Hint text (IT) |
|---------|----------------|
| Delete run | `Elimina questa run dalla classifica. Irreversibile.` |
| Install tester save | `Sovrascrive lo Slot 1 con una partita midgame di test (~14 mesi).` |
| Other admin actions | Same pattern if opaque |

- [ ] **Step 1: Wrap destructive buttons in `Hint`**

```tsx
<Hint text="Sovrascrive lo Slot 1 con una partita midgame di test (~14 mesi).">
  <button type="button" … onClick={…}>
    Installa save tester → Slot 1
  </button>
</Hint>
```

- [ ] **Step 2: ROADMAP line**

Add under Done/Next (match existing ROADMAP style): UI clarity pass — hybrid `Hint` + disabled reasons across product UI.

- [ ] **Step 3: Full verify**

Run: `npm run lint && npm test && npm run build`  
Expected: green

- [ ] **Step 4: Commit**

```bash
git add src/screens/AdminScreen.tsx ROADMAP.md
git commit -m "feat(ui): admin Hint on destructive actions + roadmap"
```

---

## Spec coverage self-review

| Spec requirement | Task |
|------------------|------|
| `Hint` API hover/focus/tap/Esc | Task 1 |
| Critical control list | Tasks 3–6 |
| Hybrid title/aria elsewhere | Tasks 3–5 |
| Copy rules IT | Task 2 |
| Comments A only on touch | Tasks 3–6 (discipline) |
| No sim changes | Global constraint |
| PR slices 1–5 | Tasks 1+2 ≈ PR1; 3=PR2; 4=PR3; 5=PR4; 6=PR5 |
| Done when / lint test build | Every task |

## Placeholder scan

No TBD/TODO/“similar to Task N” left. Helper signatures fixed in Task 2 for later imports.

## Type consistency

- `Hint` props: `text`, `children`, `side?`
- `hintOpenReducer` / `HintOpenAction` in `src/ui/hintOpen.ts`
- All `*Hint` helpers in `src/ui/controlHints.ts` as listed in Task 2

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-08-ui-clarity-tooltips.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — this session with executing-plans + checkpoints  

Which approach?
