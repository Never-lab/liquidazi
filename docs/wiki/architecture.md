# Architecture

Liquidazi is an educational Italian SRL-like business sim: React client + Node API + pure TypeScript simulation.

## Stack

| Layer | Tech |
|-------|------|
| UI | React 19, Vite, CSS modules, Zustand (`src/store/gameStore.ts`) |
| Sim | Pure functions in `src/sim/` (no React) |
| Config | `src/config/` (fiscal snapshot, staff pay, collection constants, sectors) |
| API | `server/index.mjs` — auth, cloud saves, leaderboard, feedback, admin |
| Tests | Vitest (`*.test.ts` next to code) |

Node `>=20.19` (Railway uses Node 22 via `nixpacks.toml`).

## Screens (`Screen` in `gameStore`)

`auth` → `intro` → `menu` → `setup` / `tutorial` / `guide` / `saves` / `leaderboard` / `feedback` / `admin` → `game` → `gameover`.

Routing is a switch in `src/App.tsx` on `useGameStore.screen`.

## Key folders

- `src/sim/advanceMonth.ts` — month close pipeline
- `src/sim/events.ts` — market board, accept ops, capacity
- `src/sim/collection.ts` — fiscal collection after F24
- `src/sim/acquisitions.ts` — holding subsidiaries
- `src/screens/GameHUD.tsx` — in-run UI
- `docs/wiki/` — living handbook (this tree)
- `docs/superpowers/` — historical specs/plans
- `graphify-out/` — generated code graph (optional regenerate)

## Persistence

Local slots in the store + optional cloud saves via API when authenticated. Volume-backed storage on Railway (`/data`).

## Disclaimer

Educational model — not tax advice. See root `README.md`.
