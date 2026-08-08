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

See root `README.md`: Node 22, `LIQUIDAZI_SECRET`, optional `LIQUIDAZI_ADMIN_USERNAMES`, volume mount **`/data`** (never `/app`). Health: `GET /api/health` → `"storage":"volume"`.

Auth: password min **8** chars; in-memory rate limits on register/login (20 / 15 min per IP) and feedback (8 / hour per IP). Self-reported runs clamp money stats and reject forged early `won` (&lt; 24 mesi).

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
