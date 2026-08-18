# Architecture

Floatdesk is an educational Italian SRL-like business sim: React client + Node API + pure TypeScript simulation.

## Stack

| Layer | Tech |
|-------|------|
| UI | React 19, Vite, CSS modules, Zustand (`src/store/gameStore.ts`) |
| Sim | Pure functions in `src/sim/` (no React) |
| Config | `src/config/` (fiscal snapshot, staff pay, collection constants, sectors) |
| API | `server/index.mjs` — auth, cloud saves, leaderboard, feedback, admin, event log |
| Tests | Vitest (`*.test.ts` next to code) |

Node `>=20.19` (Railway uses Node 22 via `nixpacks.toml`).

## Screens (`Screen` in `gameStore`)

`auth` → `intro` → `menu` → `setup` / `tutorial` / `guide` / `saves` / `leaderboard` / `feedback` / `admin` → `game` → `gameover`.

Routing is a switch in `src/App.tsx` on `useGameStore.screen`. Public legal pages `/privacy` and `/termini` are pathname-based (not Zustand screens); SPA fallback serves `index.html` only for those. Other unknown non-API URLs return HTML **404** (`server/notFound.html`).

## Key folders

- `src/sim/advanceMonth.ts` — month close pipeline
- `src/sim/events.ts` — market board, accept ops, capacity, demand regimes
- `src/sim/collection.ts` — fiscal collection after F24
- `src/sim/migrateGameState.ts` — defaults for older saves on load
- `src/sim/rival.ts` — rival heat / steal / contain-anchor
- `src/sim/acquisitions.ts` — holding subsidiaries
- `src/screens/GameHUD.tsx` — in-run UI
- `server/` — auth, saves, runs, feedback, rotating request log (`events.json`, no IP)
- `docs/wiki/` — living handbook (this tree)
- `docs/superpowers/` — historical specs/plans
- `graphify-out/` — generated code graph (optional regenerate; `graph.json` often gitignored if huge)

## Persistence

Local slots in the store + optional cloud saves via API when authenticated. Volume-backed storage on Railway (`/data`). Loads run through `migrateGameState`. Logged-in session: **2 hours** idle (sliding) and **7 days** from login; guests stay local-only.

## Disclaimer

Educational model — not tax advice. See root `README.md`.
