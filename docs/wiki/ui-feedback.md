# UI feedback

## Mail inbox

Header mail icon replaces the old side «Cosa succede» feed. Unread = `game.log` entries with `id > logReadThruId`. Opening / mark-read sets `logReadThruId` to max log id. Helpers: `src/sim/notifications.ts`.

## Toasts

Store shows toasts for important beats (month close, pays, shocks). Capacity/contract rejects use **`lastUiHint`**: store reads it, toasts, clears — **not** appended to `game.log` (so they do not spam the inbox).

## Banners

GameHUD keeps decision / F24 / loan / coach / Δ banners. While a cartella decision is pending, declutter rules prefer the decision banner (hide competing chrome as implemented on main).

## Coach

`src/ui/coach.ts` — soft hints (e.g. idle treasury). Not a second event log.

## Icons

`src/ui/icons.tsx` — shared glyph names for menu and HUD.
