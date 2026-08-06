# First-session Intro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After login/register/guest, first-time players see a skippable 5-step intro that explains the objective and early-game loop before the menu/setup.

**Architecture:** Pure `introGate` helpers read/write `localStorage` key `liquidazi-intro-seen`. Auth store actions route to `intro` or `menu`. New `IntroScreen` reuses tutorial CSS patterns; complete → setup, skip → menu.

**Tech Stack:** React, Zustand, Vitest, existing `MenuScreen.module.css` tutorial styles. No new npm deps.

**Spec:** `docs/superpowers/specs/2026-08-06-onboarding-clarity-design.md`  
**Branch:** `feat/onboarding-clarity` (do not merge to `main` until asked; production stays on current deploy)

## Global Constraints

- No new npm dependencies
- Copy UI in italiano (exact intro step texts from the spec)
- `localStorage` key exactly: `liquidazi-intro-seen` (value `"1"` when seen)
- Intro after auth only (login / register / guest), not before
- Salta available on every step → set flag → menu
- Final CTA “Apri la mia azienda” → set flag → setup
- Do not change cloud save debounce, mobile layout, Railway, or GameHUD coach
- `npm test` must stay green
- Menu → Tutorial remains for ripasso (leave TutorialScreen as-is unless a one-line link text change is needed)

## File map

| File | Role |
|------|------|
| `src/ui/introGate.ts` | **Create** — `INTRO_SEEN_KEY`, `hasSeenIntro()`, `markIntroSeen()`, `screenAfterAuth()` |
| `src/ui/introGate.test.ts` | **Create** — unit tests for gate |
| `src/screens/IntroScreen.tsx` | **Create** — 5-step UI |
| `src/store/gameStore.ts` | Add `"intro"` to `Screen`; route auth; `skipIntro` / `finishIntro` |
| `src/App.tsx` | Render `IntroScreen` when `screen === "intro"` |

---

### Task 1: Intro gate helpers

**Files:**
- Create: `src/ui/introGate.ts`
- Test: `src/ui/introGate.test.ts`

**Interfaces:**
- Produces:
  - `export const INTRO_SEEN_KEY = "liquidazi-intro-seen"`
  - `export const hasSeenIntro = (): boolean`
  - `export const markIntroSeen = (): void` — sets key to `"1"`
  - `export const screenAfterAuth = (): "intro" | "menu"` — `"menu"` if seen, else `"intro"`

- [ ] **Step 1: Write failing tests**

Create `src/ui/introGate.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest";
import {
  INTRO_SEEN_KEY,
  hasSeenIntro,
  markIntroSeen,
  screenAfterAuth,
} from "./introGate";

afterEach(() => {
  localStorage.removeItem(INTRO_SEEN_KEY);
});

describe("introGate", () => {
  it("starts unseen → intro", () => {
    expect(hasSeenIntro()).toBe(false);
    expect(screenAfterAuth()).toBe("intro");
  });

  it("markIntroSeen → menu thereafter", () => {
    markIntroSeen();
    expect(localStorage.getItem(INTRO_SEEN_KEY)).toBe("1");
    expect(hasSeenIntro()).toBe(true);
    expect(screenAfterAuth()).toBe("menu");
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npm test -- src/ui/introGate.test.ts`  
Expected: FAIL cannot find `./introGate`

- [ ] **Step 3: Implement `src/ui/introGate.ts`**

```ts
export const INTRO_SEEN_KEY = "liquidazi-intro-seen";

export const hasSeenIntro = (): boolean =>
  localStorage.getItem(INTRO_SEEN_KEY) === "1";

export const markIntroSeen = (): void => {
  localStorage.setItem(INTRO_SEEN_KEY, "1");
};

export const screenAfterAuth = (): "intro" | "menu" =>
  hasSeenIntro() ? "menu" : "intro";
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npm test -- src/ui/introGate.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/introGate.ts src/ui/introGate.test.ts
git commit -m "feat(intro): localStorage gate for first-session intro"
```

---

### Task 2: Store routing + IntroScreen + App

**Files:**
- Create: `src/screens/IntroScreen.tsx`
- Modify: `src/store/gameStore.ts` (`Screen`, login/register/continueAsGuest, new actions)
- Modify: `src/App.tsx`
- Test: extend `src/ui/introGate.test.ts` only if needed; manual smoke for UI. Optional store test not required if gate is covered — verify with `npm test` full suite.

**Interfaces:**
- Consumes: `screenAfterAuth`, `markIntroSeen` from Task 1
- Produces:
  - `Screen` includes `"intro"`
  - `skipIntro: () => void` — `markIntroSeen()` + `screen: "menu"`
  - `finishIntro: () => void` — `markIntroSeen()` + `screen: "setup"`
  - login / register / continueAsGuest set `screen: screenAfterAuth()` instead of always `"menu"`

- [ ] **Step 1: Add `"intro"` to `Screen` and wire auth + actions in `gameStore.ts`**

In `export type Screen`, add `"intro"` (alongside existing values).

Import:

```ts
import { markIntroSeen, screenAfterAuth } from "../ui/introGate";
```

On `GameStore` interface add:

```ts
skipIntro: () => void;
finishIntro: () => void;
```

Replace screen assignments after successful auth:

```ts
// login — after set hydration, use:
screen: screenAfterAuth(),

// register — same:
screen: screenAfterAuth(),

continueAsGuest: () => set({ auth: null, screen: screenAfterAuth() }),

skipIntro: () => {
  markIntroSeen();
  set({ screen: "menu" });
},
finishIntro: () => {
  markIntroSeen();
  set({ screen: "setup" });
},
```

Do **not** put `intro` through cloud save payload. Persist `screen` as today (`partialize`); if a persisted `screen` is `"intro"` after refresh mid-intro, that is fine. If `migrate` resets, leave as-is.

- [ ] **Step 2: Create `IntroScreen.tsx`**

```tsx
import { useState } from "react";
import { useGameStore } from "../store/gameStore";
import styles from "./MenuScreen.module.css";

const STEPS = [
  {
    title: "1 · Cos'è",
    body: "Gestisci la cassa di una SRL italiana (modello educativo). Obiettivo: non fallire.",
  },
  {
    title: "2 · Come perdi",
    body: "12 mesi di fila in rosso = KO. Non serve «vincere»: serve sopravvivere.",
  },
  {
    title: "3 · Il loop",
    body: "Accetta lavori → chiudi il mese → entrano/escono i soldi (fatture, affitto, stipendi).",
  },
  {
    title: "4 · Il Fisco",
    body: "Il mese dopo arriva l'F24 (IVA/ritenute). Saltarlo costa sanzioni e reputazione.",
  },
  {
    title: "5 · Prossimo click",
    body: "Scegli città e settore, apri l'azienda, fai il primo mese.",
  },
];

export const IntroScreen = () => {
  const skipIntro = useGameStore((s) => s.skipIntro);
  const finishIntro = useGameStore((s) => s.finishIntro);
  const [step, setStep] = useState(0);
  const last = step >= STEPS.length - 1;
  const current = STEPS[step]!;

  return (
    <div className={styles.shell}>
      <p className={styles.brandMark}>Liquidazi</p>
      <h2 className={styles.headline}>Prima di aprire l&apos;azienda</h2>
      <p className={styles.lede}>
        Passo {step + 1} di {STEPS.length}. Puoi saltare quando vuoi.
      </p>

      <div className={styles.menu} style={{ margin: "0 0 16px", maxWidth: "100%" }}>
        <div className={styles.tutCard}>
          <h3 className={styles.tutStep}>{current.title}</h3>
          <p className={styles.subtitle}>{current.body}</p>
        </div>

        <div className={styles.tutDots}>
          {STEPS.map((_, i) => (
            <span key={i} className={i === step ? styles.tutDotOn : styles.tutDot} />
          ))}
        </div>

        <div className={styles.actions}>
          {!last ? (
            <button type="button" className={styles.primary} onClick={() => setStep((s) => s + 1)}>
              Capito, avanti
            </button>
          ) : (
            <button type="button" className={styles.primary} onClick={() => finishIntro()}>
              Apri la mia azienda
            </button>
          )}
          {step > 0 && (
            <button type="button" className={styles.secondary} onClick={() => setStep((s) => s - 1)}>
              Indietro
            </button>
          )}
          <button type="button" className={styles.secondary} onClick={() => skipIntro()}>
            Salta
          </button>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Wire `App.tsx`**

Import `IntroScreen`. In main switch:

```tsx
{screen === "intro" && <IntroScreen />}
```

Include `"intro"` in `bareShell` if the intro should look like auth/menu without the small header (recommended):

```tsx
const bareShell =
  screen === "menu" || screen === "auth" || screen === "gameover" || screen === "intro";
```

- [ ] **Step 4: Run full test suite**

Run: `npm test`  
Expected: all green (including introGate)

- [ ] **Step 5: Manual smoke**

```bash
npm run dev
# (api optional for guest path)
```

1. Clear site data / `localStorage.removeItem('liquidazi-intro-seen')`.
2. Continua senza account → Intro 5 steps → Salta → Menu; refresh → guest/auth path without re-showing intro if flag set.
3. Clear flag again → guest → complete to “Apri la mia azienda” → Setup.
4. Menu → Tutorial still works.

- [ ] **Step 6: Commit**

```bash
git add src/screens/IntroScreen.tsx src/store/gameStore.ts src/App.tsx
git commit -m "feat(intro): first-session skippable intro after auth"
```

---

## Self-review (plan vs spec)

| Spec item | Task |
|-----------|------|
| 5-step copy A+C | Task 2 IntroScreen |
| After auth, skippable | Task 2 store + screen |
| Flag `liquidazi-intro-seen` | Task 1 |
| Final → setup; Salta → menu | Task 2 `finishIntro` / `skipIntro` |
| Tutorial menu unchanged | Honored |
| Save 15s / mobile out of scope | Honored |
| main deploy untouched until merge | Branch note |

No TBD placeholders. Types: `"intro" \| "menu"` from `screenAfterAuth` matches store.
