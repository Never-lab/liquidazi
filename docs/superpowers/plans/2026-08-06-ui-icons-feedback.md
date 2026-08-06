# UI Icons Slice 1 + Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Shared SVG `Icon` set; iconized menu/auth; Feedback screen opening GitHub issue drafts.

**Architecture:** `src/ui/icons.tsx` + `src/config/repo.ts`; `FeedbackScreen`; wire `Screen`/`App`/`MenuScreen`/`AuthScreen` + CSS.

**Tech Stack:** React, TypeScript, CSS modules. No new npm deps.

**Spec:** `docs/superpowers/specs/2026-08-06-ui-icons-feedback-design.md`

## Global Constraints

- No new npm dependencies
- Italian copy
- GitHub URLs via `window.open(..., "noopener,noreferrer")`
- Keep auth FormData autofill + password eye
- HUD/panels out of scope
- `npm test` green

## Tasks

### Task 1: `icons.tsx` + `repo.ts` (+ unit test for URLs)

### Task 2: `FeedbackScreen` + store `feedback` screen + App

### Task 3: Menu/Auth icon rows + CSS

Each task: implement → `npm test` → commit.
