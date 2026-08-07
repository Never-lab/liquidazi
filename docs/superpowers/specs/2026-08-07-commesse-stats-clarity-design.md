# Commesse stats clarity — Design

**Date:** 2026-08-07  
**Branch:** `feat/beta-feedback-pass`  
**Status:** Approved for planning  
**Goal:** Make the stats above “Commesse del mese” understandable: what each term means and what it does, without adding custom popovers.

## Context

Beta testers report that the dense badge (`tetto · slot · scorte · rep · contratti`) is unclear. Confusion is vocabulary, not which numbers to prioritize. Chosen approach: human labels + native `title` tooltips, plus a one-shot coach/Guide tip (approaches 1 + 3).

## Requirements

1. Replace the single opaque badge in `OpportunitiesPanel` with labeled chips/text for the five stats.
2. Each chip has a one-line Italian `title` explaining effect on play.
3. Add an early coach tip that introduces the legend; works with existing dismiss/re-enable Guide flow.
4. No new dependencies; no custom tooltip/popover component.

## Non-goals

- Redesign of deal cards or Accetta/Lascia actions
- Changes to the post-close **Δ cassa** banner
- Expanding sticky-header short labels (`scorte` / `rep`) — out of reported pain
- Deep panel icons (ROADMAP slice 3)

## UI — OpportunitiesPanel head

Replace:

```text
tetto {cap} · {taken}/{capacity} slot · scorte {n}m · rep {r} · contratti {c}
```

With labeled items (same values, clearer words):

| Label | Value | `title` (tooltip) |
|-------|--------|-------------------|
| Tetto max | `{formatCash(cap)}` | Massimo netto accettabile su una singola vendita questo mese |
| Capacità | `{taken}/{capacity}` | Vendite accettate / slot disponibili questo mese |
| Scorte | `{n} mesi` | Mesi di magazzino; a zero ticket più bassi e più insoluti |
| Reputazione | `{N}` (rounded) | Quanto ti cercano i clienti (0–100) |
| Contratti | `{count}` | Contratti multi-mese attivi: ognuno blocca 1 slot |

Show **Contratti** only when `count > 0` (same as today). Keep the muted help paragraph under the head as-is unless copy conflicts.

CSS: reuse/extend `panels.module.css` (e.g. wrap chips, readable on narrow screens — wrap allowed, no horizontal scroll).

## Coach / Guide

Add a tip in `src/ui/coach.ts`, early game (e.g. month 0 after first board is visible, or month 1 before hire tip), id like `commesse-legend`:

- **Title:** Cosa significano i numeri sopra le commesse  
- **Body:** short pointer — Capacità = vendite accettate / slot del mese; Tetto max = limite per una singola vendita; Scorte = mesi di magazzino. Su desktop, passa sui chip per il dettaglio.

Priority: after first-deal / close-month tips so it does not block the opening loop; before hire/upgrade tips.

## Sticky header

No change in this slice.

## Success

A new player can answer, without asking: what capacity means, what happens if scorte hit 0, and what a contract does to slots — from labels + `title` and/or the coach tip.
