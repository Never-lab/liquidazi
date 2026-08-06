# Publish Liquidazi (Railway) — Design

**Date:** 2026-08-06  
**Status:** Approved for planning  
**Goal:** Make the full game (UI + auth + leaderboard + cloud saves) publicly reachable on a free Railway subdomain; custom domain later.

## Context

Liquidazi is a Vite + React SPA with a zero-dep Node API (`server/index.mjs`) for auth and leaderboard. Saves today live only in `localStorage` (`liquidazi-save` via Zustand persist), so logging in on another device shows empty slots. There is no existing deploy config.

## Requirements

1. Public URL (Railway free subdomain is enough; custom domain deferred).
2. Full stack: playable game + accounts + shared leaderboard.
3. After login/register, the player sees **their** three save slots on any browser/device.
4. Minimal change: one Railway service, no separate DB for v1.

## Architecture

One Railway Web Service:

1. **Build:** `npm ci` → `npm run build` (Vite → `dist/`).
2. **Start:** `node server/index.mjs` listening on `$PORT`.
3. **Routing:** `/api/*` = API; all other GETs serve static files from `dist/` with SPA fallback to `index.html`.
4. **Persistence:** Railway volume mounted at `server/data` for `users.json`, `runs.json`, and per-user save files.
5. **Secret:** if `RAILWAY_ENVIRONMENT` is set (or `NODE_ENV=production`), refuse to start unless `LIQUIDAZI_SECRET` is set and is not the hardcoded dev default.
6. **Deploy:** push to `main` → Railway rebuild. Same-origin `/api` — no production CORS setup.

```
Browser ──same origin──► Railway Node
                          ├─ /api/*  → auth, runs, leaderboard, saves
                          └─ /*      → dist/ (SPA)
                          └─ volume  → server/data/
```

## Cloud saves

### Behavior

- On successful login/register: `GET /api/saves` hydrates `slots`, `activeSlot`, and optional prefs (`preferredDifficulty`, `coachOn`).
- When slots change (existing `persistActiveSlot` / slot mutations): debounced (~1s) `PUT /api/saves`.
- `localStorage` remains a local cache; **server is source of truth when authenticated**.
- On logout: clear game/slots from client state so another account cannot see prior saves.

### API

| Method | Path | Auth | Body / response |
|--------|------|------|-----------------|
| GET | `/api/saves` | Bearer | `{ slots, activeSlot, preferredDifficulty?, coachOn? }` |
| PUT | `/api/saves` | Bearer | same shape; atomic overwrite for that user |

Storage: `server/data/saves/<userId>.json` (userId already hex from auth; no user-controlled path segments).

If a user has never saved, GET returns empty slots (same shape as client `emptySlots()`).

### Client changes

- Extend `src/api/client.ts` with `fetchSaves` / `putSaves`.
- On login/register success: pull saves before entering menu/game.
- Wire debounced PUT after slot sync.
- Keep Zustand persist for offline resilience; do not treat local-only slots as authoritative after a successful cloud pull.

## Code / config surface

| Change | Location |
|--------|----------|
| Static + SPA fallback | `server/index.mjs` |
| Saves GET/PUT + size limit | `server/index.mjs` |
| Require `LIQUIDAZI_SECRET` in prod | `server/index.mjs` |
| `start` script | `package.json` → `node server/index.mjs` |
| Railway build/start | `railway.toml`: build `npm ci && npm run build`, start `npm start` |
| Deploy notes | `README.md` |

**Out of scope (v1):** custom domain, Docker, separate DB, GitHub Actions CI, offline multi-device conflict merge, share slots between users.

## Errors & security

- Login path: if `GET /api/saves` fails after auth, show a clear error; do not silently enter with empty cloud state as if it were authoritative.
- Save path: if `PUT` fails, toast that cloud save failed; localStorage still holds the local copy.
- Debounce PUT ~1s.
- Body size cap for saves: **1 MB** raw JSON.
- Saves scoped strictly to token `userId`.

## Verification

- API: register → PUT saves → GET with same token returns payload; second user cannot read first user’s file.
- Client: after login, slots match server.
- Smoke on Railway URL: `/api/health`, load SPA, register/login, save, reload / second browser → same slots.

## Go-live checklist

1. Land code on `main` and push.
2. Create Railway project from `Never-lab/liquidazi`, set `LIQUIDAZI_SECRET`, attach volume at `server/data`.
3. Confirm public URL; share it. Domain can be attached later without redesign.
