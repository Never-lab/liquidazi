# Publish Liquidazi (Railway) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy Liquidazi as one Railway service (SPA + API) with auth, leaderboard, and cloud save slots that follow the logged-in user across devices.

**Architecture:** Refactor the zero-dep Node server into a testable `createHandler` that serves `/api/*` plus `dist/` static files; add `GET/PUT /api/saves` persisted under `server/data/saves/<userId>.json`. Client pulls saves on login/register and debounced-pushes on slot changes. Railway builds Vite then runs `npm start`.

**Tech Stack:** Vite, React, TypeScript, Zustand, Node `http` (no new npm deps), Vitest, Railway.

**Spec:** `docs/superpowers/specs/2026-08-06-publish-railway-design.md`

## Global Constraints

- No new npm dependencies
- Copy UI in italiano
- Same-origin `/api` in production (no CORS changes required for browser clients)
- Saves body hard limit: **1 MB**
- Cloud PUT debounce: **~1s**
- Production secret: refuse start when `RAILWAY_ENVIRONMENT` is set or `NODE_ENV=production` unless `LIQUIDAZI_SECRET` is set and ≠ `liquidazi-dev-secret-change-me`
- `npm test` must stay green; add server tests under `server/`
- Out of scope: custom domain, Docker, DB, GitHub Actions, offline conflict merge

## File map

| File | Role |
|------|------|
| `server/app.mjs` | **Create** — `createHandler({ dataDir, secret, distDir })` with auth, runs, leaderboard, saves, static SPA |
| `server/index.mjs` | Thin entry: env checks, listen on `$PORT` |
| `server/app.test.ts` | **Create** — HTTP integration tests (saves + static) |
| `src/api/client.ts` | `CloudSaves`, `fetchSaves`, `putSaves` |
| `src/store/gameStore.ts` | Pull on login/register; clear on logout; debounced cloud push |
| `src/screens/AuthScreen.tsx` | Update lede copy (account = classifica + salvataggi) |
| `package.json` | Add `"start": "node server/index.mjs"` |
| `railway.toml` | **Create** — build + start |
| `README.md` | Deploy / volume / secret notes |

---

### Task 1: Server cloud saves API

**Files:**
- Create: `server/app.mjs`
- Modify: `server/index.mjs` (thin wrapper calling `createHandler`)
- Test: `server/app.test.ts`

**Interfaces:**
- Consumes: existing auth/token/run/leaderboard behavior from current `server/index.mjs`
- Produces:
  - `createHandler({ dataDir: string, secret: string, distDir: string | null }) => (req, res) => void`
  - `GET /api/saves` → `{ slots, activeSlot, preferredDifficulty?, coachOn? }`
  - `PUT /api/saves` → same shape, 200, writes `dataDir/saves/<userId>.json`
  - Empty default: three slots `{ label: "Slot N", game: null, updatedAt: null }`, `activeSlot: 0`

- [ ] **Step 1: Write failing integration test**

Create `server/app.test.ts`:

```ts
import { createServer } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHandler } from "./app.mjs";

const SECRET = "test-secret-not-dev-default";
let dataDir: string;
let base: string;
let server: ReturnType<typeof createServer>;

const api = async (path: string, opts: RequestInit = {}) => {
  const res = await fetch(`${base}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
};

beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "liquidazi-"));
  const handler = createHandler({ dataDir, secret: SECRET, distDir: null });
  server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("no port");
  base = `http://127.0.0.1:${addr.port}`;
});

afterAll(() => {
  server.close();
  rmSync(dataDir, { recursive: true, force: true });
});

describe("cloud saves", () => {
  it("GET /api/saves requires auth", async () => {
    const { status } = await api("/api/saves");
    expect(status).toBe(401);
  });

  it("register → empty saves → PUT → GET roundtrip; other user isolated", async () => {
    const reg = await api("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "alice_srl", password: "secret1" }),
    });
    expect(reg.status).toBe(201);
    const token = (reg.data as { token: string }).token;

    const empty = await api("/api/saves", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(empty.status).toBe(200);
    expect((empty.data as { slots: unknown[] }).slots).toHaveLength(3);
    expect((empty.data as { slots: { game: null }[] }).slots[0].game).toBeNull();

    const payload = {
      slots: [
        {
          label: "Run A",
          game: { company: { name: "Test SRL", cash: 1234 } },
          updatedAt: "2026-08-06T12:00:00.000Z",
        },
        { label: "Slot 2", game: null, updatedAt: null },
        { label: "Slot 3", game: null, updatedAt: null },
      ],
      activeSlot: 0,
      preferredDifficulty: "normal",
      coachOn: true,
    };
    const put = await api("/api/saves", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    expect(put.status).toBe(200);

    const got = await api("/api/saves", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(got.status).toBe(200);
    expect(got.data).toMatchObject(payload);

    const bob = await api("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "bob_srl", password: "secret1" }),
    });
    const bobToken = (bob.data as { token: string }).token;
    const bobSaves = await api("/api/saves", {
      headers: { Authorization: `Bearer ${bobToken}` },
    });
    expect((bobSaves.data as { slots: { game: null }[] }).slots[0].game).toBeNull();
  });

  it("rejects saves body over 1MB", async () => {
    const reg = await api("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "fat_user", password: "secret1" }),
    });
    const token = (reg.data as { token: string }).token;
    const huge = "x".repeat(1_000_001);
    const put = await api("/api/saves", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        slots: [{ label: "Slot 1", game: { pad: huge }, updatedAt: null }],
        activeSlot: 0,
      }),
    });
    expect(put.status).toBe(413);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm test -- server/app.test.ts`  
Expected: FAIL cannot find `./app.mjs` (or export missing)

- [ ] **Step 3: Move logic into `server/app.mjs` + thin `server/index.mjs`**

Create `server/app.mjs` by moving the current `server/index.mjs` implementation into `export function createHandler({ dataDir, secret, distDir })`, parameterizing `DATA` → `dataDir`, `SECRET` → `secret`. Keep all existing `/api/*` routes.

Add:

```js
const MAX_SAVE_BYTES = 1_000_000;
const emptySlots = () => [
  { label: "Slot 1", game: null, updatedAt: null },
  { label: "Slot 2", game: null, updatedAt: null },
  { label: "Slot 3", game: null, updatedAt: null },
];
const emptySaves = () => ({
  slots: emptySlots(),
  activeSlot: 0,
  preferredDifficulty: "normal",
  coachOn: true,
});

const savePath = (userId) => join(dataDir, "saves", `${userId}.json`);

const loadUserSaves = (userId) => {
  const p = savePath(userId);
  if (!existsSync(p)) return emptySaves();
  return JSON.parse(readFileSync(p, "utf8"));
};

const readBodyLimited = (req, maxBytes) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > maxBytes) {
        reject(Object.assign(new Error("too large"), { code: "ENTITY_TOO_LARGE" }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
```

Routes (inside handler, after auth helpers exist):

```js
if (req.method === "GET" && path === "/api/saves") {
  const user = parseToken(req.headers.authorization);
  if (!user) return json(res, 401, { error: "Non autenticato" });
  return json(res, 200, loadUserSaves(user.id));
}

if (req.method === "PUT" && path === "/api/saves") {
  const user = parseToken(req.headers.authorization);
  if (!user) return json(res, 401, { error: "Non autenticato" });
  let body;
  try {
    body = await readBodyLimited(req, MAX_SAVE_BYTES);
  } catch (e) {
    if (e && e.code === "ENTITY_TOO_LARGE") {
      return json(res, 413, { error: "Salvataggio troppo grande" });
    }
    return json(res, 400, { error: "JSON non valido" });
  }
  if (!Array.isArray(body.slots) || body.slots.length !== 3) {
    return json(res, 400, { error: "Servono esattamente 3 slot" });
  }
  const activeSlot = Number(body.activeSlot);
  if (!Number.isInteger(activeSlot) || activeSlot < 0 || activeSlot > 2) {
    return json(res, 400, { error: "activeSlot non valido" });
  }
  const payload = {
    slots: body.slots,
    activeSlot,
    preferredDifficulty: body.preferredDifficulty,
    coachOn: body.coachOn,
  };
  mkdirSync(join(dataDir, "saves"), { recursive: true });
  writeFileSync(savePath(user.id), JSON.stringify(payload));
  return json(res, 200, payload);
}
```

For other routes that already use `readBody`, keep them; only saves use the limited reader (or use limited reader everywhere with a higher default — saves must use 1MB).

`server/index.mjs`:

```js
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHandler } from "./app.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dir, "data");
const PORT = Number(process.env.PORT || 8787);
const DEV_SECRET = "liquidazi-dev-secret-change-me";
const SECRET = process.env.LIQUIDAZI_SECRET || DEV_SECRET;
const isProd =
  Boolean(process.env.RAILWAY_ENVIRONMENT) || process.env.NODE_ENV === "production";

if (isProd && (!process.env.LIQUIDAZI_SECRET || SECRET === DEV_SECRET)) {
  console.error("LIQUIDAZI_SECRET must be set to a non-default value in production");
  process.exit(1);
}

const distDir = join(__dir, "..", "dist");
const handler = createHandler({ dataDir: DATA, secret: SECRET, distDir });
createServer(handler).listen(PORT, () => {
  console.log(`Liquidazi on http://127.0.0.1:${PORT}`);
});
```

Ensure `mkdirSync(dataDir, { recursive: true })` runs inside `createHandler`.

- [ ] **Step 4: Run tests — expect PASS**

Run: `npm test -- server/app.test.ts`  
Expected: PASS (all cloud saves tests)

- [ ] **Step 5: Commit**

```bash
git add server/app.mjs server/index.mjs server/app.test.ts
git commit -m "feat(server): cloud saves API with integration tests"
```

---

### Task 2: Static `dist/` + SPA fallback

**Files:**
- Modify: `server/app.mjs`
- Modify: `server/app.test.ts`

**Interfaces:**
- Consumes: `distDir` from Task 1
- Produces: GET non-`/api` paths serve files under `distDir`; missing asset with no extension (or HTML navigation) → `index.html`; if `distDir` is `null`, non-api → 404 JSON (as today for tests)

- [ ] **Step 1: Write failing static tests**

Append to `server/app.test.ts`:

```ts
import { mkdirSync, writeFileSync } from "node:fs";

describe("static spa", () => {
  let staticBase: string;
  let staticServer: ReturnType<typeof createServer>;
  let staticDist: string;

  beforeAll(async () => {
    staticDist = mkdtempSync(join(tmpdir(), "liquidazi-dist-"));
    writeFileSync(join(staticDist, "index.html"), "<!doctype html><title>L</title>");
    mkdirSync(join(staticDist, "assets"), { recursive: true });
    writeFileSync(join(staticDist, "assets", "app.js"), "console.log(1)");
    const handler = createHandler({
      dataDir: mkdtempSync(join(tmpdir(), "liquidazi-d2-")),
      secret: SECRET,
      distDir: staticDist,
    });
    staticServer = createServer(handler);
    await new Promise<void>((resolve) => staticServer.listen(0, "127.0.0.1", resolve));
    const addr = staticServer.address();
    if (!addr || typeof addr === "string") throw new Error("no port");
    staticBase = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(() => {
    staticServer.close();
    rmSync(staticDist, { recursive: true, force: true });
  });

  it("serves index and js; SPA fallback for client route", async () => {
    const idx = await fetch(`${staticBase}/`);
    expect(idx.status).toBe(200);
    expect(await idx.text()).toContain("<title>L</title>");

    const js = await fetch(`${staticBase}/assets/app.js`);
    expect(js.status).toBe(200);
    expect(await js.text()).toBe("console.log(1)");

    const spa = await fetch(`${staticBase}/saves`);
    expect(spa.status).toBe(200);
    expect(await spa.text()).toContain("<title>L</title>");
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm test -- server/app.test.ts`  
Expected: FAIL on static assertions (404 JSON)

- [ ] **Step 3: Implement static serving in `createHandler`**

At end of handler, before final 404 (only when `distDir` is set):

```js
import { createReadStream, statSync } from "node:fs";
import { extname } from "node:path";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

const safeJoin = (root, reqPath) => {
  const decoded = decodeURIComponent(reqPath.split("?")[0]);
  const rel = decoded === "/" ? "/index.html" : decoded;
  const full = join(root, rel);
  if (!full.startsWith(root)) return null;
  return full;
};

const sendFile = (res, filePath) => {
  const ext = extname(filePath);
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
  createReadStream(filePath).pipe(res);
};
```

Logic when method is GET/HEAD and path does not start with `/api`:

```js
if (distDir && (req.method === "GET" || req.method === "HEAD")) {
  let filePath = safeJoin(distDir, path);
  const trySend = (p) => {
    try {
      const st = statSync(p);
      if (st.isFile()) {
        if (req.method === "HEAD") {
          res.writeHead(200, { "Content-Type": MIME[extname(p)] || "application/octet-stream" });
          res.end();
          return true;
        }
        sendFile(res, p);
        return true;
      }
    } catch {
      /* missing */
    }
    return false;
  };
  if (filePath && trySend(filePath)) return;
  const indexPath = join(distDir, "index.html");
  if (!extname(path) && trySend(indexPath)) return;
  return json(res, 404, { error: "Not found" });
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npm test -- server/app.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/app.mjs server/app.test.ts
git commit -m "feat(server): serve Vite dist with SPA fallback"
```

---

### Task 3: Client cloud sync

**Files:**
- Modify: `src/api/client.ts`
- Modify: `src/store/gameStore.ts`
- Modify: `src/screens/AuthScreen.tsx`
- Test: `src/api/cloudSaves.test.ts` (pure helpers if extracted) — prefer testing via a small `normalizeCloudSaves` in `src/api/client.ts` or `src/api/saves.ts`

**Interfaces:**
- Consumes: `GET/PUT /api/saves` from Task 1
- Produces:
  - `export type CloudSaves = { slots: SaveSlot[]; activeSlot: number; preferredDifficulty?: DifficultyId; coachOn?: boolean }`
  - `fetchSaves(token: string): Promise<CloudSaves>`
  - `putSaves(token: string, saves: CloudSaves): Promise<CloudSaves>`
  - login/register: auth → fetchSaves → hydrate → `screen: "menu"`; on fetch failure throw (AuthScreen shows error; do not set menu)
  - logout: clear `auth`, reset `slots` to empty, `activeSlot: 0`, `game: createInitialGameState()`, `screen: "auth"`
  - debounced put (~1s) when authenticated and slots/activeSlot/prefs change

- [ ] **Step 1: Write failing client API test**

Create `src/api/cloudSaves.test.ts` — mock `fetch` for `fetchSaves`/`putSaves` shapes. First export the functions from `client.ts`, then:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchSaves, putSaves } from "./client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("cloud saves client", () => {
  it("fetchSaves GETs /api/saves with bearer", async () => {
    const payload = {
      slots: [
        { label: "Slot 1", game: null, updatedAt: null },
        { label: "Slot 2", game: null, updatedAt: null },
        { label: "Slot 3", game: null, updatedAt: null },
      ],
      activeSlot: 1,
      preferredDifficulty: "easy",
      coachOn: false,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, opts?: RequestInit) => {
        expect(url).toBe("/api/saves");
        expect((opts?.headers as Record<string, string>).Authorization).toBe("Bearer tok");
        return {
          ok: true,
          json: async () => payload,
        };
      }),
    );
    await expect(fetchSaves("tok")).resolves.toEqual(payload);
  });

  it("putSaves PUTs body", async () => {
    const body = {
      slots: [
        { label: "A", game: null, updatedAt: null },
        { label: "B", game: null, updatedAt: null },
        { label: "C", game: null, updatedAt: null },
      ],
      activeSlot: 0,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, opts?: RequestInit) => {
        expect(opts?.method).toBe("PUT");
        expect(JSON.parse(String(opts?.body))).toEqual(body);
        return { ok: true, json: async () => body };
      }),
    );
    await expect(putSaves("tok", body)).resolves.toEqual(body);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm test -- src/api/cloudSaves.test.ts`  
Expected: FAIL (`fetchSaves` / `putSaves` not exported)

- [ ] **Step 3: Add client methods**

In `src/api/client.ts`:

```ts
import type { SaveSlot } from "../store/gameStore";
import type { DifficultyId } from "../config/difficulty";

export type CloudSaves = {
  slots: SaveSlot[];
  activeSlot: number;
  preferredDifficulty?: DifficultyId;
  coachOn?: boolean;
};

export const fetchSaves = (token: string) =>
  api<CloudSaves>("/api/saves", { token });

export const putSaves = (token: string, saves: CloudSaves) =>
  api<CloudSaves>("/api/saves", {
    method: "PUT",
    token,
    body: JSON.stringify(saves),
  });
```

If circular import (`gameStore` → `client` → `gameStore`) appears, move `SaveSlot` type to `src/api/savesTypes.ts` or duplicate a minimal slot type in `client.ts`:

```ts
export type CloudSaveSlot = {
  label: string;
  game: unknown | null;
  updatedAt: string | null;
};
```

Prefer **no circular import**: define `CloudSaveSlot` in `client.ts` and keep `SaveSlot` compatible in the store.

- [ ] **Step 4: Wire `gameStore`**

Update imports:

```ts
import {
  fetchSaves,
  putSaves,
  login as apiLogin,
  register as apiRegister,
} from "../api/client";
```

Module-level:

```ts
let cloudTimer: ReturnType<typeof setTimeout> | null = null;

const queueCloudSave = (get: () => GameStore) => {
  const { auth, slots, activeSlot, preferredDifficulty, coachOn } = get();
  if (!auth) return;
  if (cloudTimer) clearTimeout(cloudTimer);
  cloudTimer = setTimeout(() => {
    const s = get();
    if (!s.auth) return;
    void putSaves(s.auth.token, {
      slots: s.slots,
      activeSlot: s.activeSlot,
      preferredDifficulty: s.preferredDifficulty,
      coachOn: s.coachOn,
    }).catch(() => {
      get().flashToast("Salvataggio cloud non riuscito", "bad");
    });
  }, 1000);
};
```

Replace login/register/logout:

```ts
login: async (username, password) => {
  const session = await apiLogin(username, password);
  const saves = await fetchSaves(session.token);
  const active = saves.slots[saves.activeSlot] ?? saves.slots[0];
  const game = active?.game
    ? structuredClone(active.game)
    : createInitialGameState();
  set({
    auth: session,
    slots: saves.slots,
    activeSlot: saves.activeSlot ?? 0,
    preferredDifficulty: saves.preferredDifficulty ?? get().preferredDifficulty,
    coachOn: saves.coachOn ?? get().coachOn,
    game,
    screen: "menu",
  });
},
register: async (username, password) => {
  const session = await apiRegister(username, password);
  const saves = await fetchSaves(session.token);
  set({
    auth: session,
    slots: saves.slots,
    activeSlot: saves.activeSlot ?? 0,
    preferredDifficulty: saves.preferredDifficulty ?? "normal",
    coachOn: saves.coachOn ?? true,
    game: createInitialGameState(),
    screen: "menu",
  });
},
logout: () => {
  if (cloudTimer) clearTimeout(cloudTimer);
  set({
    auth: null,
    screen: "auth",
    slots: emptySlots(),
    activeSlot: 0,
    game: createInitialGameState(),
  });
},
```

After creating the store, subscribe once:

```ts
useGameStore.subscribe((state, prev) => {
  if (!state.auth) return;
  if (
    state.slots === prev.slots &&
    state.activeSlot === prev.activeSlot &&
    state.preferredDifficulty === prev.preferredDifficulty &&
    state.coachOn === prev.coachOn
  ) {
    return;
  }
  queueCloudSave(() => useGameStore.getState());
});
```

Note: login `set` will schedule one PUT after 1s (harmless echo of server state).

Update AuthScreen lede:

```tsx
<p className={styles.lede}>
  Puoi giocare subito come ospite. L&apos;account salva le partite sul cloud e
  sblocca la classifica.
</p>
```

- [ ] **Step 5: Run tests**

Run: `npm test -- src/api/cloudSaves.test.ts`  
Expected: PASS  

Run: `npm test`  
Expected: all green

- [ ] **Step 6: Manual smoke (dev)**

```bash
npm run dev:api
npm run dev
```

Register → play briefly → advance month / save slot → hard refresh → same slots. Logout → login as other user → empty. Re-login first user → slots restored.

- [ ] **Step 7: Commit**

```bash
git add src/api/client.ts src/api/cloudSaves.test.ts src/store/gameStore.ts src/screens/AuthScreen.tsx
git commit -m "feat(client): sync save slots to cloud on login"
```

---

### Task 4: Railway package + docs

**Files:**
- Modify: `package.json`
- Create: `railway.toml`
- Modify: `README.md`

**Interfaces:**
- Produces: `npm start` runs server; Railway build `npm ci && npm run build`; start `npm start`

- [ ] **Step 1: Add start script**

In `package.json` scripts:

```json
"start": "node server/index.mjs",
"dev": "vite",
"dev:api": "node server/index.mjs",
"build": "tsc -b && vite build",
"lint": "oxlint",
"test": "vitest run",
"preview": "vite preview"
```

- [ ] **Step 2: Create `railway.toml`**

```toml
[build]
builder = "NIXPACKS"
buildCommand = "npm ci && npm run build"

[deploy]
startCommand = "npm start"
healthcheckPath = "/api/health"
restartPolicyType = "ON_FAILURE"
```

- [ ] **Step 3: README deploy section**

Add after “Come eseguire”:

```markdown
## Deploy (Railway)

1. Push `main` to GitHub (`Never-lab/liquidazi`).
2. New Railway project → Deploy from repo.
3. Variables: set `LIQUIDAZI_SECRET` to a long random string (required).
4. Volume: mount persistent volume at `/app/server/data` (path may be `/app/server/data` depending on Nixpacks root — confirm service root is repo root so `server/data` is correct). Prefer absolute path matching `server/data` relative to start cwd.
5. Generate domain → open URL → register → play → reload on another browser: same slots.

Local production-ish check:

```bash
npm run build
set LIQUIDAZI_SECRET=dev-only-local
set NODE_ENV=production
npm start
```

Then open `http://127.0.0.1:8787`.
```

Adjust volume path wording to: mount at `server/data` relative to the service working directory (repo root).

- [ ] **Step 4: Verify build + start locally**

```bash
npm run build
$env:LIQUIDAZI_SECRET="local-prod-secret"; $env:NODE_ENV="production"; npm start
```

Expected: server listens; `GET /api/health` → `{"ok":true}`; `GET /` returns built index.

Ctrl+C when done.

- [ ] **Step 5: Commit**

```bash
git add package.json railway.toml README.md
git commit -m "chore: Railway start config and deploy docs"
```

- [ ] **Step 6: Go-live (human + agent assist)**

1. `git push -u origin main` (only if user asked to push / confirmed).
2. Create Railway project from repo; set secret; attach volume to `server/data`.
3. Confirm public URL; smoke register/login/save/second browser.
4. Share URL.

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| Single Railway service, build Vite, start Node | Task 4 |
| `/api/*` + static SPA | Task 2 |
| Volume `server/data` | Task 4 README + existing data dir |
| Require non-default secret in prod | Task 1 `index.mjs` |
| GET/PUT `/api/saves`, 3 slots, per-user file | Task 1 |
| Pull on login/register; debounce PUT; localStorage cache | Task 3 |
| Logout clears slots | Task 3 |
| GET fails → error, no silent empty menu | Task 3 (throw before set menu) |
| PUT fail → toast | Task 3 |
| 1 MB body limit | Task 1 |
| Custom domain / Docker / DB out of scope | Honored |

No TBD placeholders. Types: `CloudSaves` / slot shape aligned across Tasks 1 and 3.
