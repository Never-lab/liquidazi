# Deploy & tooling

## Local

```bash
npm install
npm run dev:api   # :8787
npm run dev       # :5173, proxies /api
npm test
npm run build
```

## Railway

Two environments, same Nixpacks build. Details and dashboard checklist: root [`README.md`](../../README.md) (Deploy).

| Env | Trigger |
|-----|---------|
| **staging** | GitHub autodeploy on `main` (Wait for CI) |
| **production** | GitHub Action [deploy-production.yml](../../.github/workflows/deploy-production.yml) on tag `v*.*.*` — **not** every `main` push |

Each env: own Postgres (or legacy volume `/data`), own `LIQUIDAZI_SECRET`, own public URL. Do not clone prod player data onto staging.

Health: `GET /api/health` → `"storage":"postgres"` when `DATABASE_URL` is set. Migrate legacy volume: `npm run db:migrate-from-volume`.

Auth: password min **8** chars; session token HMAC **2h idle** / **7 day** absolute cap (legacy 3-part tokens rejected). In-memory rate limits on register/login (20 / 15 min per IP) and feedback (8 / hour per IP). Self-reported runs clamp money stats and reject forged early `won` (&lt; 24 mesi). Ops `/ops` shows a rotating request log (`events.json`, last 2000; no IP, query, body, or token).

Static files: hashed `/assets/*` `Cache-Control: public, max-age=31536000, immutable`; `index.html` / `ops.html` `no-cache`; other root files `max-age=3600`. Unknown non-API paths: HTML **404** (`server/notFound.html`); SPA fallback only for `/privacy` and `/termini`. `npm run dev` (Vite) may still serve the app on unknown URLs.

## Wiki maintenance

| Command | Purpose |
|---------|---------|
| `npm run wiki:sync-help` | Regenerate `src/content/guidePages.ts` from `docs/wiki/help/` |
| `npm run wiki:sync-github` | Mirror `docs/wiki/` → GitHub Wiki (`*.wiki.git`) |

Edit **`docs/wiki/` in git** only; Wiki UI is a mirror.

## Graphify

Install `graphifyy` (uv/pip). From repo root (code graph, no LLM key required):

```bash
python -m graphify extract . --code-only --out .
python -m graphify cluster-only . --no-viz --no-label
```

Then generate agent wiki articles under `graphify-out/wiki/` via `graphify.wiki.to_wiki` (see last refresh commit / agent session). Prefer committing `GRAPH_REPORT.md` and `wiki/`; **`graph.json` is gitignored** when large — regenerate locally for deep code queries.

Agents: if `graphify-out/` is missing, regenerate locally before deep architecture questions.
