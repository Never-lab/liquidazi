# Notification inbox (mail) — replace EventFeed — Design

**Date:** 2026-08-08  
**Branch:** `feat/notification-inbox`  
**Status:** Approved for implementation  
**Goal:** Replace the side-panel «Cosa succede» logger with a header mail icon + unread badge and a compact inbox popover/sheet. Alert banners stay as they are.

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Scope | Replace EventFeed only (option C) |
| UX | Mail icon in sticky header + badge (approach 1) |
| Data | Existing `game.log`; unread = entries with `id > logReadThruId` |
| Persist | `GameState.logReadThruId: number` (default 0); migrate `??= 0` |
| Alerts | Unchanged (F24, decisioni, prestito, coach, Δ mese) |

## Non-goals

- Browser push, filters, search
- Moving F24/cartella into the inbox
- Deleting `game.log` from the sim

## UI

1. Remove `EventFeed` from the aux side panel; rename toggle to «Grafici» only.
2. Header sticky: mail button; badge count = `log.filter(e => e.id > logReadThruId).length` (cap display at 9+).
3. Open → popover/sheet listing up to 12 log lines (newest first), tone styling.
4. Opening the inbox (or explicit «Segna lette») sets `logReadThruId = max(log ids)`.

## Files

- `src/sim/types.ts` — `logReadThruId`
- `src/components/NotificationInbox.tsx` (+ CSS module or GameHUD styles)
- `src/screens/GameHUD.tsx` — wire icon, drop EventFeed
- `src/ui/icons.tsx` — `mail` glyph
- Delete or stop importing `EventFeed.tsx` if unused
- Light test: unread count helper

## Done when

- No «Cosa succede» panel
- Mail badge reflects unread log lines; open clears unread
- Charts aux panel still works
- `npm test` green
