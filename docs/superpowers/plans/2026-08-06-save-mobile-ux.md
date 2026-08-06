# Cloud Save Pacing + Mobile UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Debounce authenticated cloud saves to 15s with a bottom status pill and flush-on-hide, then improve mobile HUD (then menu/auth/setup) without redesigning desktop.

**Architecture:** Extract a small `cloudSaveQueue` module (timer + status + flush) used by `gameStore`; render `CloudSavePill` from App when authenticated. Mobile = CSS-only tightening of existing `560px` / `720px` breakpoints.

**Tech Stack:** React, Zustand, Vitest, CSS modules. No new npm deps.

**Spec:** `docs/superpowers/specs/2026-08-06-save-mobile-ux-design.md`  
**Branch:** `feat/save-mobile-ux`

## Global Constraints

- No new npm dependencies
- Copy UI in italiano: “In coda…”, “Sincronizzo…”, “Salvato”
- `CLOUD_SAVE_MS = 15_000` exactly
- Guests: no PUT, no pill
- Keep toast on PUT failure: “Salvataggio cloud non riuscito”
- Flush pending on `visibilitychange` (hidden) and `pagehide`
- Prefer existing breakpoints (`max-width: 560px`, `min-width: 720px`) — do not invent a third unless necessary
- Do not change intro onboarding, Railway, or `/api/saves` contract
- `npm test` must stay green

## File map

| File | Role |
|------|------|
| `src/api/cloudSaveQueue.ts` | **Create** — debounce, status, flush, bind to putSaves |
| `src/api/cloudSaveQueue.test.ts` | **Create** — fake timers tests |
| `src/store/gameStore.ts` | Use queue; expose `cloudSaveStatus`; wire visibility flush once |
| `src/components/CloudSavePill.tsx` | **Create** — bottom pill UI |
| `src/components/CloudSavePill.module.css` | **Create** |
| `src/App.tsx` | Mount pill |
| `src/screens/GameHUD.module.css` | Mobile HUD pass |
| `src/screens/MenuScreen.module.css` | Mobile menu/auth/setup pass |
| `src/App.module.css` | Optional bottom padding so pill doesn’t cover content |

---

### Task 1: Cloud save queue (15s + status + flush)

**Files:**
- Create: `src/api/cloudSaveQueue.ts`
- Create: `src/api/cloudSaveQueue.test.ts`
- Modify: `src/store/gameStore.ts` (replace inline `queueCloudSave` / `cloudTimer`)

**Interfaces:**
- Produces:
  - `export type CloudSaveStatus = "hidden" | "pending" | "syncing" | "saved"`
  - `export const CLOUD_SAVE_MS = 15_000`
  - `export const SAVED_VISIBLE_MS = 2_000`
  - `createCloudSaveQueue({ put, onStatus, onError, getPayload, getToken })` returning `{ schedule(), flush(), clear(), getStatus() }`
  - Store: `cloudSaveStatus: CloudSaveStatus` (not persisted); subscribe still calls `schedule` when auth + slots/prefs change; logout calls `clear()`

- [ ] **Step 1: Write failing tests**

Create `src/api/cloudSaveQueue.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CLOUD_SAVE_MS, createCloudSaveQueue, type CloudSaveStatus } from "./cloudSaveQueue";

describe("cloudSaveQueue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces to 15s and reports pending → syncing → saved", async () => {
    const statuses: CloudSaveStatus[] = [];
    const put = vi.fn(async () => ({}));
    const q = createCloudSaveQueue({
      put,
      getToken: () => "tok",
      getPayload: () => ({ slots: [], activeSlot: 0 }),
      onStatus: (s) => statuses.push(s),
      onError: () => {},
    });

    q.schedule();
    q.schedule();
    expect(put).not.toHaveBeenCalled();
    expect(statuses.at(-1)).toBe("pending");

    await vi.advanceTimersByTimeAsync(CLOUD_SAVE_MS - 1);
    expect(put).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(put).toHaveBeenCalledTimes(1);
    expect(statuses).toContain("syncing");
    await Promise.resolve();
    expect(statuses.at(-1)).toBe("saved");
  });

  it("flush runs immediately when pending", async () => {
    const put = vi.fn(async () => ({}));
    const q = createCloudSaveQueue({
      put,
      getToken: () => "tok",
      getPayload: () => ({ slots: [], activeSlot: 0 }),
      onStatus: () => {},
      onError: () => {},
    });
    q.schedule();
    await q.flush();
    expect(put).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(CLOUD_SAVE_MS);
    expect(put).toHaveBeenCalledTimes(1);
  });

  it("clear cancels pending timer", async () => {
    const put = vi.fn(async () => ({}));
    const q = createCloudSaveQueue({
      put,
      getToken: () => "tok",
      getPayload: () => ({ slots: [], activeSlot: 0 }),
      onStatus: () => {},
      onError: () => {},
    });
    q.schedule();
    q.clear();
    await vi.advanceTimersByTimeAsync(CLOUD_SAVE_MS);
    expect(put).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm test -- src/api/cloudSaveQueue.test.ts`  
Expected: FAIL module missing

- [ ] **Step 3: Implement `src/api/cloudSaveQueue.ts`**

```ts
import type { CloudSaves } from "./client";

export type CloudSaveStatus = "hidden" | "pending" | "syncing" | "saved";

export const CLOUD_SAVE_MS = 15_000;
export const SAVED_VISIBLE_MS = 2_000;

type Deps = {
  put: (token: string, saves: CloudSaves) => Promise<unknown>;
  getToken: () => string | null;
  getPayload: () => CloudSaves;
  onStatus: (status: CloudSaveStatus) => void;
  onError: () => void;
};

export const createCloudSaveQueue = (deps: Deps) => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let savedTimer: ReturnType<typeof setTimeout> | null = null;
  let status: CloudSaveStatus = "hidden";
  let inFlight = false;

  const setStatus = (next: CloudSaveStatus) => {
    status = next;
    deps.onStatus(next);
  };

  const runPut = async () => {
    const token = deps.getToken();
    if (!token || inFlight) return;
    inFlight = true;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    setStatus("syncing");
    try {
      await deps.put(token, deps.getPayload());
      setStatus("saved");
      if (savedTimer) clearTimeout(savedTimer);
      savedTimer = setTimeout(() => setStatus("hidden"), SAVED_VISIBLE_MS);
    } catch {
      deps.onError();
      setStatus("hidden");
    } finally {
      inFlight = false;
    }
  };

  return {
    getStatus: () => status,
    schedule: () => {
      if (!deps.getToken()) return;
      if (savedTimer) {
        clearTimeout(savedTimer);
        savedTimer = null;
      }
      setStatus("pending");
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void runPut();
      }, CLOUD_SAVE_MS);
    },
    flush: async () => {
      if (!deps.getToken()) return;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (status === "pending" || status === "syncing") {
        await runPut();
      }
    },
    clear: () => {
      if (timer) clearTimeout(timer);
      timer = null;
      if (savedTimer) clearTimeout(savedTimer);
      savedTimer = null;
      setStatus("hidden");
    },
  };
};
```

Adjust `flush` so a pending schedule always flushes even if status race — if timer was set, clear and `runPut`. Spec: flush when pending.

- [ ] **Step 4: Wire `gameStore.ts`**

Remove module-level `cloudTimer` / old `queueCloudSave`.

Add to store state (not in `partialize`):

```ts
cloudSaveStatus: "hidden" as CloudSaveStatus,
```

Create queue once after store creation (or lazy singleton):

```ts
import { createCloudSaveQueue } from "../api/cloudSaveQueue";
import type { CloudSaveStatus } from "../api/cloudSaveQueue";

// after useGameStore is defined:
const cloudQueue = createCloudSaveQueue({
  put: putSaves,
  getToken: () => useGameStore.getState().auth?.token ?? null,
  getPayload: () => {
    const s = useGameStore.getState();
    return {
      slots: s.slots,
      activeSlot: s.activeSlot,
      preferredDifficulty: s.preferredDifficulty,
      coachOn: s.coachOn,
    };
  },
  onStatus: (cloudSaveStatus) => useGameStore.setState({ cloudSaveStatus }),
  onError: () =>
    useGameStore.getState().flashToast("Salvataggio cloud non riuscito", "bad"),
});

useGameStore.subscribe((state, prev) => {
  if (!state.auth) return;
  if (
    state.slots === prev.slots &&
    state.activeSlot === prev.activeSlot &&
    state.preferredDifficulty === prev.preferredDifficulty &&
    state.coachOn === prev.coachOn
  ) {
    return;
  }
  cloudQueue.schedule();
});
```

Logout: `cloudQueue.clear()` instead of only clearing timer.

Register document listeners once (module side-effect in store file or `main.tsx`):

```ts
if (typeof document !== "undefined") {
  const flush = () => {
    void cloudQueue.flush();
  };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
  window.addEventListener("pagehide", flush);
}
```

Ensure `cloudSaveStatus` is **not** in `partialize`.

- [ ] **Step 5: Run tests**

Run: `npm test -- src/api/cloudSaveQueue.test.ts`  
Then: `npm test`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/api/cloudSaveQueue.ts src/api/cloudSaveQueue.test.ts src/store/gameStore.ts
git commit -m "feat(save): debounce cloud PUT to 15s with flush on hide"
```

---

### Task 2: CloudSavePill UI

**Files:**
- Create: `src/components/CloudSavePill.tsx`
- Create: `src/components/CloudSavePill.module.css`
- Modify: `src/App.tsx`
- Modify: `src/App.module.css` (padding-bottom when pill visible optional)

**Interfaces:**
- Consumes: `useGameStore` → `auth`, `cloudSaveStatus`
- Produces: pill visible only if `auth` and status ≠ `hidden`

- [ ] **Step 1: Implement pill**

```tsx
import { useGameStore } from "../store/gameStore";
import styles from "./CloudSavePill.module.css";

const LABEL: Record<string, string> = {
  pending: "In coda…",
  syncing: "Sincronizzo…",
  saved: "Salvato",
};

export const CloudSavePill = () => {
  const auth = useGameStore((s) => s.auth);
  const status = useGameStore((s) => s.cloudSaveStatus);
  if (!auth || status === "hidden") return null;
  return (
    <div className={styles.pill} role="status" aria-live="polite">
      <span className={styles.icon} aria-hidden>
        {/* simple cloud SVG */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M7 18h10a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.4-1.5A3.5 3.5 0 0 0 7 18z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
      </span>
      <span>{LABEL[status]}</span>
    </div>
  );
};
```

CSS: `position: fixed; bottom: calc(12px + env(safe-area-inset-bottom)); left: 50%; transform: translateX(-50%);` z-index above content; soft surface background; small radius; don’t cover full width on desktop (auto width + padding).

- [ ] **Step 2: Mount in `App.tsx` next to `ToastHost`**

```tsx
import { CloudSavePill } from "./components/CloudSavePill";
// ...
<CloudSavePill />
```

- [ ] **Step 3: Manual smoke** — login, rename slot, see “In coda…”; wait 15s → “Sincronizzo…” → “Salvato”. Guest: no pill.

- [ ] **Step 4: Commit**

```bash
git add src/components/CloudSavePill.tsx src/components/CloudSavePill.module.css src/App.tsx src/App.module.css
git commit -m "feat(ui): bottom cloud save status pill"
```

---

### Task 3: Mobile CSS (HUD then menu)

**Files:**
- Modify: `src/screens/GameHUD.module.css` (priority)
- Modify: `src/screens/MenuScreen.module.css` (auth/menu/setup share this)
- Modify: `src/components/panels.module.css` and/or `ui.module.css` only if HUD tabs need it

**Interfaces:** none (CSS only)

- [ ] **Step 1: HUD `@media (max-width: 560px)` pass**

Concrete targets (tune against DevTools 390×844):

- `.desk` / `.deskBody`: slightly larger gap/padding; `overflow-x: hidden` on desk if needed
- `.sticky`: ensure cash row wraps cleanly; `.cash` font readable (`clamp`); actions full-width row with `min-height: 44px` buttons
- Tab strip / panel headers: increase padding and tap area
- Avoid shrinking kicker text below ~11px

Inspect live class names in `GameHUD.tsx` / CSS before editing — only touch rules that exist.

- [ ] **Step 2: Menu/auth/setup `@media (max-width: 560px)` or strengthen existing `< 720px` block**

In `MenuScreen.module.css`:

- `.primary` / `.secondary`: `width: 100%` on small screens; `min-height: 44px`
- `.field input`: `min-height: 44px`; comfortable padding
- `.secondaryNav` / `.navLink`: wrap + padding ≥ 12px 16px
- `.lede` / dense paragraphs: slightly reduced margin stacking

- [ ] **Step 3: Visual check**

DevTools iPhone width: play one month without horizontal scroll; auth form usable; menu CTAs full-width.

- [ ] **Step 4: `npm test` + commit**

```bash
git add src/screens/GameHUD.module.css src/screens/MenuScreen.module.css
# plus any panel/ui CSS touched
git commit -m "fix(ui): breathe mobile HUD and menu layouts"
```

---

## Self-review (plan vs spec)

| Spec | Task |
|------|------|
| 15s debounce | Task 1 |
| Pill labels | Task 2 |
| Flush on hide | Task 1 |
| Guest no pill/PUT | Task 1–2 |
| HUD then menu mobile | Task 3 |
| No new deps / no API change | Honored |

No TBD. `CLOUD_SAVE_MS = 15_000` and status union align across tasks.
