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

## Wiki maintenance

| Command | Purpose |
|---------|---------|
| `npm run wiki:sync-help` | Regenerate `src/content/guidePages.ts` from `docs/wiki/help/` |
| `npm run wiki:sync-github` | Mirror `docs/wiki/` → GitHub Wiki (`*.wiki.git`) |

Edit **`docs/wiki/` in git** only; Wiki UI is a mirror.

## Graphify

Install `graphifyy` (uv/pip). From repo root:

```text
graphify .           # or project’s full pipeline
graphify . --wiki
```

Commit policy: keep `GRAPH_REPORT.md` and small wiki extracts; gitignore heavy HTML/SVG if needed. Agents: if `graphify-out/` is missing, regenerate locally before deep architecture questions.
