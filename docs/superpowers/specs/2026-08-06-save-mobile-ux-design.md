# Cloud save pacing + mobile UX — Design

**Date:** 2026-08-06  
**Branch:** `feat/save-mobile-ux`  
**Status:** Approved for planning  
**Goal:** Stop flooding cloud save requests, give clear bottom save feedback, and make the first-session mobile experience (especially in-game HUD) less cramped — without touching the live intro PR or redesigning desktop.

## Context

On production, authenticated play queues a cloud `PUT /api/saves` after **1s** on every slots/prefs change, which can spam the API. Friends also found the UI too squeezed on phones. Intro onboarding ships separately (`feat/onboarding-clarity` / PR #3).

## Requirements

1. Debounce cloud saves to **~15 seconds**.
2. Bottom **pill** when logged in: icon + short status (“In coda…” / “Sincronizzo…” / “Salvato”).
3. Flush pending save when the tab hides (`visibilitychange` / `pagehide`) so a 15s window does not silently drop the last action.
4. Mobile layout pass: **HUD first**, then menu / auth / setup.
5. Guests: no cloud PUT, no save pill (unchanged).

## Non-goals

- First-session intro (other branch)
- Full mobile redesign / new navigation paradigm
- Desktop visual redesign
- Backend API changes (still `PUT /api/saves`)
- New npm dependencies

## Cloud save

### Behavior

- Constant `CLOUD_SAVE_MS = 15_000` in the client store (or small `src/api/cloudSave.ts` helper).
- On authenticated slots / `activeSlot` / `preferredDifficulty` / `coachOn` change: schedule one debounced PUT (reset timer on further changes).
- States for the pill (store or tiny UI state):
  - **hidden** — guest, or idle after “Salvato” fade
  - **pending** — changes waiting for the 15s timer (“In coda…”)
  - **syncing** — request in flight (“Sincronizzo…”)
  - **saved** — success (“Salvato”), then auto-hide ~2s
  - On failure: keep existing toast “Salvataggio cloud non riuscito”; pill can return to pending or hide
- On `document.visibilityState === "hidden"` or `pagehide`: if pending/auth, flush immediately (clear timer, PUT once).
- Logout still clears the timer (no orphan PUT).

### UI

- Fixed bottom pill, above disclaimer if needed; does not block primary CTAs.
- Small cloud/folder-style icon (CSS or inline SVG — no emoji dependency).
- Italian copy only.

## Mobile layout

Breakpoint: strengthen existing mobile paths — project already uses `max-width: 560px` and `min-width: 720px` in HUD/menu CSS. Prefer improving those queries rather than inventing a third breakpoint unless needed.

### HUD (priority)

- Sticky header denser but readable (cash / Δ not truncated awkwardly).
- No horizontal overflow on main desk.
- Tabs / panels: comfortable vertical scroll, larger tap targets, breathing padding.
- Primary actions (close month, F24) reachable without zooming.

### Then menu / auth / setup

- Primary buttons full-width where cramped.
- Form fields taller; secondary nav wraps with ≥ ~44px tap targets.
- Reduce stacked text density on small viewports.

Desktop layouts stay as close as possible to current look outside the media query.

## Code surface (expected)

| Area | Change |
|------|--------|
| `gameStore` / cloud queue | 15s debounce, flush on hide, sync status for pill |
| New small component e.g. `CloudSavePill` | Bottom status UI |
| `GameHUD.module.css` (+ related) | Mobile media queries |
| `MenuScreen.module.css` / auth / setup CSS | Secondary mobile pass |
| `App.module.css` | Safe area / pill clearance if needed |

## Verification

- Logged in: spam slot renames → at most one PUT per ~15s while focused; pill cycles pending → syncing → saved.
- Hide tab with pending changes → PUT fires promptly.
- Guest: no pill, no PUT.
- Phone width (DevTools ~390px): HUD usable without horizontal scroll; menu/auth/setup tap-friendly.
- `npm test` green; no new deps.

## Success criteria

Fewer cloud requests under active play, visible save feedback, and a playable HUD on mobile without waiting for a full redesign.
