# First-session intro (onboarding clarity) — Design

**Date:** 2026-08-06  
**Branch:** `feat/onboarding-clarity`  
**Status:** Approved for planning  
**Goal:** Make the first session clear about *what Liquidazi is* and *how to play the first minutes*, without blocking skippers. Leave production `main` unchanged until this ships.

## Context

Friends testing the live deploy said first access is unclear. Today the flow is: Auth → Menu → optional Tutorial (3 technical steps, easy to miss). The game objective (cash survival / 12 red months KO) and the core loop are not front-and-center.

## Requirements

1. **A — Objective:** First-time players understand they run an educational Italian SRL cash sim and how they lose.
2. **C — First minutes:** They see the play loop (jobs → close month → F24) before diving into the HUD.
3. Intro is **strong but skippable** (“Avanti” + “Salta” on every step).
4. Show intro **after** auth (login / register / guest), not before.
5. Do not break returning players: once seen, go straight to menu.

## Non-goals (this branch)

- Cloud save debounce (15s) and save indicator animation → **next branch**
- Mobile layout un-cramping → **next branch**
- Rewriting in-game coach / GameHUD
- Changing auth, cloud saves API, or Railway deploy

## Flow

```
Auth (login | register | guest)
        │
        ▼
 liquidazi-intro-seen? ──yes──► Menu
        │ no
        ▼
   Intro (5 steps)
   ├─ Salta ──────────► set flag → Menu
   └─ Fine / “Apri…” ─► set flag → Setup (or Menu if they back out)
```

- Persist `liquidazi-intro-seen = "1"` in `localStorage` when the player finishes or skips.
- Existing Menu → Tutorial remains for replay / ripasso (can keep current 3 steps or later align copy; not required to rewrite in v1).

## Intro content (5 steps, IT)

1. **Cos’è** — Gestisci la cassa di una SRL italiana (modello educativo). Obiettivo: non fallire.
2. **Come perdi** — 12 mesi di fila in rosso = KO. Non serve “vincere”: serve sopravvivere.
3. **Il loop** — Accetta lavori → chiudi il mese → entrano/escono i soldi (fatture, affitto, stipendi).
4. **Il Fisco** — Il mese dopo arriva l’F24 (IVA/ritenute). Saltarlo costa sanzioni e reputazione.
5. **Prossimo click** — Scegli città e settore, apri l’azienda, fai il primo mese.

## UI / code surface

| Piece | Role |
|-------|------|
| New screen `intro` (or `IntroScreen`) | Card + dots + Avanti / Indietro / Salta; reuse `MenuScreen.module.css` / tutorial styles |
| `gameStore` | After login/register/`continueAsGuest`: route to `intro` if flag missing, else `menu`; actions to complete/skip intro |
| `App.tsx` | Render intro screen |
| `localStorage` key `liquidazi-intro-seen` | One-shot gate |

No new npm dependencies. Copy in Italian.

## Success criteria

- First visit after auth: intro appears; Salta and complete both set the flag and do not show intro again on that browser.
- Returning visit: Auth → Menu (if already authenticated via persist) or Auth → Menu without intro if flag set.
- Production `main` stays on current deploy until this branch is merged deliberately.

## Follow-ups (documented, not built here)

1. Debounce cloud `PUT /api/saves` to ~15s + bottom save indicator.
2. Mobile layout pass (less cramped HUD/menu).
