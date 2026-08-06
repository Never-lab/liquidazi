# UI icons (slice 1) + Feedback → GitHub Issues — Design

**Date:** 2026-08-06  
**Branch:** `feat/ui-icons-feedback`  
**Status:** Approved for planning  
**Goal:** Make menu/auth less text-heavy with a small shared SVG icon set, and add an in-app Feedback screen that opens GitHub issue drafts (bug / enhancement). Lay groundwork for later HUD/panel icon passes.

## Context

Friends find the UI very textual. Feedback today has no in-game path — reports would require finding the repo manually. Full-game iconography is too large for one cycle; this is **slice 1** of three.

## Requirements

1. Shared zero-dep SVG icon system (`Icon` + named glyphs).
2. Menu + auth: icons beside primary CTAs and secondary nav links; slightly shorter labels where helpful.
3. Feedback screen from menu with two actions that open GitHub `issues/new` with label + title prefix.
4. Italian copy; new tab; note that a GitHub account is needed.
5. No new npm dependencies; no GitHub API token.

## Non-goals (this slice)

- HUD tabs / panels icon pass (slice 2)
- Deep panel iconography (slice 3)
- In-app issue form posting via API
- Emoji as primary icons
- Desktop redesign beyond icon + nav density

## Icon system

**File:** `src/ui/icons.tsx`

- `export type IconName = "play" | "resume" | "save" | "trophy" | "book" | "bug" | "spark" | "login" | "logout" | "user" | "chevron" | "feedback"`
- `Icon({ name, size?: number, className?: string })` — 24×24 viewBox, stroke ~1.8, `currentColor`, `aria-hidden` when decorative.
- Style aligned with existing auth eye / cloud pill strokes.

## Menu / auth

- Menu secondary nav: icon + label row (Salvataggi, Classifiche, Tutorial, Feedback, Accedi/Esci).
- Primary CTAs: Nuova partita (`play`), Riprendi (`resume`) if shown.
- Auth: optional small icons on primary actions; keep FormData autofill fix and password eye intact.
- CSS: `.navLink` / new `.navRow` with icon gap; tap targets unchanged (~44px).

## Feedback screen

- `Screen` adds `"feedback"`.
- `FeedbackScreen`: headline + short lede; two cards/buttons:
  - **Segnala un bug** → `Icon bug` → open  
    `https://github.com/Never-lab/liquidazi/issues/new?labels=bug&title=Bug%3A%20`
  - **Chiedi una miglioria** → `Icon spark` → open  
    `https://github.com/Never-lab/liquidazi/issues/new?labels=enhancement&title=Idea%3A%20`
- Config: `src/config/repo.ts` with `GITHUB_REPO = "Never-lab/liquidazi"` and helpers `bugReportUrl()`, `enhancementUrl()`.
- Back to menu. `window.open(url, "_blank", "noopener,noreferrer")`.

## App wiring

- `App.tsx`: render `FeedbackScreen` when `screen === "feedback"`.
- Include in bareShell or with header consistently with other secondary screens (match Tutorial/Saves pattern).

## Verification

- Menu shows icons; Feedback opens GitHub new-issue with correct label in a new tab.
- Auth login/register/autofill/password eye still work.
- `npm test` green; no new deps.

## Follow-ups

2. HUD icons (tabs, close month, F24).  
3. Panel-level icons.
