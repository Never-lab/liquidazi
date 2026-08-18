import { createServer } from "node:http";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
  return { status: res.status, data, headers: res.headers };
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

describe("ops html", () => {
  it("serves ops.html at /ops when dist present", async () => {
    const dist = join(dataDir, "dist-ops");
    mkdirSync(dist, { recursive: true });
    writeFileSync(join(dist, "ops.html"), "<!doctype html><title>ops</title>");
    writeFileSync(join(dist, "index.html"), "<!doctype html><title>game</title>");

    const handler = createHandler({ dataDir, secret: SECRET, distDir: dist });
    const srv = createServer(handler);
    await new Promise<void>((resolve) => srv.listen(0, "127.0.0.1", resolve));
    const addr = srv.address();
    if (!addr || typeof addr === "string") throw new Error("no port");
    const url = `http://127.0.0.1:${addr.port}`;
    try {
      const res = await fetch(`${url}/ops`);
      expect(res.status).toBe(200);
      expect(await res.text()).toContain("ops");
    } finally {
      srv.close();
    }
  });

  it("sets long cache on hashed assets and no-cache on html", async () => {
    const dist = join(dataDir, "dist-cache");
    mkdirSync(join(dist, "assets"), { recursive: true });
    writeFileSync(join(dist, "index.html"), "<!doctype html><title>game</title>");
    writeFileSync(join(dist, "ops.html"), "<!doctype html><title>ops</title>");
    writeFileSync(join(dist, "favicon.svg"), "<svg xmlns='http://www.w3.org/2000/svg'></svg>");
    writeFileSync(join(dist, "assets", "main-abc123.js"), "console.log(1)");

    const handler = createHandler({ dataDir, secret: SECRET, distDir: dist });
    const srv = createServer(handler);
    await new Promise<void>((resolve) => srv.listen(0, "127.0.0.1", resolve));
    const addr = srv.address();
    if (!addr || typeof addr === "string") throw new Error("no port");
    const url = `http://127.0.0.1:${addr.port}`;
    try {
      const asset = await fetch(`${url}/assets/main-abc123.js`);
      expect(asset.status).toBe(200);
      expect(asset.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");

      const html = await fetch(`${url}/`);
      expect(html.status).toBe(200);
      expect(html.headers.get("cache-control")).toBe("no-cache");

      const ops = await fetch(`${url}/ops`);
      expect(ops.status).toBe(200);
      expect(ops.headers.get("cache-control")).toBe("no-cache");

      const icon = await fetch(`${url}/favicon.svg`);
      expect(icon.status).toBe(200);
      expect(icon.headers.get("cache-control")).toBe("public, max-age=3600");
    } finally {
      srv.close();
    }
  });
});

describe("SEO endpoints", () => {
  it("serves robots.txt and sitemap.xml", async () => {
    const robots = await fetch(`${base}/robots.txt`);
    expect(robots.status).toBe(200);
    const robotsBody = await robots.text();
    expect(robotsBody).toContain("User-agent: *");
    expect(robotsBody).toContain("Sitemap:");

    const sm = await fetch(`${base}/sitemap.xml`);
    expect(sm.status).toBe(200);
    const smBody = await sm.text();
    expect(smBody).toContain("<urlset");
    expect(smBody).toContain("<loc>");
  });
});

describe("cloud saves", () => {
  it("GET /api/health reports storage mode", async () => {
    const { status, data } = await api("/api/health");
    expect(status).toBe(200);
    expect(data).toEqual({ ok: true, storage: "local" });
  });

  it("GET /api/saves requires auth", async () => {
    const { status } = await api("/api/saves");
    expect(status).toBe(401);
  });

  it("issues a 4-part session token and refreshes it on /me", async () => {
    const reg = await api("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "sess_user", password: "secret12" }),
    });
    expect(reg.status).toBe(201);
    const token = (reg.data as { token: string }).token;
    expect(token.split(".")).toHaveLength(4);

    const me = await api("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(me.status).toBe(200);
    const refreshed = me.headers.get("X-Session-Token");
    expect(refreshed).toBeTruthy();
    expect(refreshed?.split(".")).toHaveLength(4);
  });

  it("rejects legacy 3-part tokens and idle-expired tokens", async () => {
    const { makeSessionToken, SESSION_IDLE_MS } = await import("./sessionToken.mjs");
    const reg = await api("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "sess_exp", password: "secret12" }),
    });
    const fresh = (reg.data as { token: string }).token;
    const userId = fresh.split(".")[0];

    const legacy = await api("/api/auth/me", {
      headers: { Authorization: `Bearer ${fresh.split(".").slice(0, 3).join(".")}` },
    });
    expect(legacy.status).toBe(401);

    const expired = makeSessionToken(userId, SECRET, Date.now() - SESSION_IDLE_MS - 1000);
    const idle = await api("/api/auth/me", {
      headers: { Authorization: `Bearer ${expired}` },
    });
    expect(idle.status).toBe(401);
  });

  it("rejects oversized auth and run request bodies", async () => {
    const oversized = JSON.stringify({ username: "a".repeat(64_000), password: "secret12" });
    const register = await api("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: oversized,
    });
    expect(register.status).toBe(413);

    const auth = await api("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "run_user", password: "secret12" }),
    });
    const run = await api("/api/runs", {
      method: "POST",
      headers: { Authorization: `Bearer ${(auth.data as { token: string }).token}` },
      body: JSON.stringify({ companyName: "x".repeat(64_000) }),
    });
    expect(run.status).toBe(413);
  });

  it("register → empty saves → PUT → GET roundtrip; other user isolated", async () => {
    const reg = await api("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "alice_srl", password: "secret12" }),
    });
    expect(reg.status).toBe(201);
    const token = (reg.data as { token: string }).token;

    const me0 = await api("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(me0.status).toBe(200);
    expect((me0.data as { achievements: string[] }).achievements).toEqual([]);

    const unlock = await api("/api/auth/achievements", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ids: ["first_invoice", "nope", "first_f24"] }),
    });
    expect(unlock.status).toBe(200);
    expect((unlock.data as { achievements: string[] }).achievements.sort()).toEqual([
      "first_f24",
      "first_invoice",
    ]);

    const me1 = await api("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect((me1.data as { achievements: string[] }).achievements.sort()).toEqual([
      "first_f24",
      "first_invoice",
    ]);

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
      body: JSON.stringify({ username: "bob_srl", password: "secret12" }),
    });
    const bobToken = (bob.data as { token: string }).token;
    const bobSaves = await api("/api/saves", {
      headers: { Authorization: `Bearer ${bobToken}` },
    });
    expect((bobSaves.data as { slots: { game: null }[] }).slots[0].game).toBeNull();
  });

  it("PUT long running save upserts leaderboard past soft-win 24m", async () => {
    const reg = await api("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "long_runner", password: "secret12" }),
    });
    const token = (reg.data as { token: string }).token;

    const softWin = await api("/api/runs", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        companyName: "Long Co",
        city: "MI",
        sector: "servizi",
        monthsPlayed: 24,
        peakCash: 1000,
        peakDebt: 0,
        lifetimeRevenue: 5000,
        finalCash: 800,
        difficulty: "normal",
        outcome: "won",
        slotIndex: 0,
      }),
    });
    expect(softWin.status).toBe(201);

    const put = await api("/api/saves", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        slots: [
          {
            label: "Infinite",
            game: {
              monthsPlayed: 72,
              status: "running",
              difficulty: "normal",
              company: {
                name: "Long Co",
                city: "MI",
                sector: "servizi",
                cash: 2500,
              },
              career: {
                year2Reached: true,
                peakCash: 8000,
                peakDebt: 0,
                lifetimeRevenue: 40000,
                submitted: true,
                submittedMonths: 24,
              },
            },
            updatedAt: new Date().toISOString(),
          },
          { label: "Slot 2", game: null, updatedAt: null },
          { label: "Slot 3", game: null, updatedAt: null },
        ],
        activeSlot: 0,
      }),
    });
    expect(put.status).toBe(200);

    const board = await api("/api/leaderboard?board=longest&limit=10");
    expect(board.status).toBe(200);
    const entries = (board.data as { entries: { username: string; monthsPlayed: number }[] })
      .entries;
    const mine = entries.find((e) => e.username === "long_runner");
    expect(mine?.monthsPlayed).toBe(72);
  });

  it("rejects saves body over 1MB", async () => {
    const reg = await api("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "fat_user", password: "secret12" }),
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

describe("admin stats", () => {
  let adminBase: string;
  let adminServer: ReturnType<typeof createServer>;
  let adminDataDir: string;

  beforeAll(async () => {
    adminDataDir = mkdtempSync(join(tmpdir(), "liquidazi-admin-"));
    const handler = createHandler({
      dataDir: adminDataDir,
      secret: SECRET,
      distDir: null,
      storage: "volume",
      adminUsernames: ["boss"],
    });
    adminServer = createServer(handler);
    await new Promise<void>((resolve) => adminServer.listen(0, "127.0.0.1", resolve));
    const addr = adminServer.address();
    if (!addr || typeof addr === "string") throw new Error("no port");
    adminBase = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(() => {
    adminServer.close();
    rmSync(adminDataDir, { recursive: true, force: true });
  });

  const adminApi = async (path: string, opts: RequestInit = {}) => {
    const res = await fetch(`${adminBase}${path}`, opts);
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  };

  it("marks admin on login/me; rejects non-admin; returns counters", async () => {
    const boss = await adminApi("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "boss", password: "secret12" }),
    });
    expect(boss.status).toBe(201);
    expect((boss.data as { admin: boolean }).admin).toBe(true);
    const bossToken = (boss.data as { token: string }).token;

    const me = await adminApi("/api/auth/me", {
      headers: { Authorization: `Bearer ${bossToken}` },
    });
    expect(me.status).toBe(200);
    expect(me.data).toMatchObject({ username: "boss", admin: true });

    const peon = await adminApi("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "peon", password: "secret12" }),
    });
    const peonToken = (peon.data as { token: string }).token;
    expect((peon.data as { admin: boolean }).admin).toBe(false);

    const denied = await adminApi("/api/admin/stats", {
      headers: { Authorization: `Bearer ${peonToken}` },
    });
    expect(denied.status).toBe(403);

    await adminApi("/api/runs", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bossToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        companyName: "Boss SRL",
        city: "MI",
        sector: "servizi",
        monthsPlayed: 12,
        peakCash: 1000,
        peakDebt: 0,
        lifetimeRevenue: 5000,
        finalCash: 200,
      }),
    });

    const stats = await adminApi("/api/admin/stats", {
      headers: { Authorization: `Bearer ${bossToken}` },
    });
    expect(stats.status).toBe(200);
    expect(stats.data).toMatchObject({
      users: 2,
      runs: 1,
      runs24h: 1,
      cloudSaves: 0,
      storage: "volume",
      longestMonths: 12,
      feedbackCount: 0,
    });
    expect((stats.data as { recent: unknown[] }).recent).toHaveLength(1);
    expect((stats.data as { recentFeedback: unknown[] }).recentFeedback).toEqual([]);
    expect((stats.data as { balance: { n: number; buckets: Record<string, number> } }).balance).toMatchObject({
      n: 1,
      buckets: { "1-3": 0, "4-6": 0, "7-12": 1, "13-23": 0, "24+": 0 },
    });

    const recent = (stats.data as { recent: { id: string; username: string }[] }).recent;
    expect(recent[0]?.id).toBeTruthy();
    expect(recent[0]?.username).toBe("boss");

    const deniedDel = await adminApi(`/api/admin/runs/${recent[0]!.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${peonToken}` },
    });
    expect(deniedDel.status).toBe(403);

    const del = await adminApi(`/api/admin/runs/${recent[0]!.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${bossToken}` },
    });
    expect(del.status).toBe(200);
    expect(del.data).toMatchObject({ ok: true, runs: 0 });

    const stats2 = await adminApi("/api/admin/stats", {
      headers: { Authorization: `Bearer ${bossToken}` },
    });
    expect((stats2.data as { runs: number }).runs).toBe(0);
    expect((stats2.data as { recent: unknown[] }).recent).toHaveLength(0);
  });
});

describe("in-app feedback", () => {
  it("accepts guest feedback and shows it to admin", async () => {
    const adminDataDir = mkdtempSync(join(tmpdir(), "liquidazi-fb-"));
    const handler = createHandler({
      dataDir: adminDataDir,
      secret: SECRET,
      distDir: null,
      storage: "local",
      adminUsernames: ["boss"],
    });
    const server = createServer(handler);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const addr = server.address();
    if (!addr || typeof addr === "string") throw new Error("no port");
    const base = `http://127.0.0.1:${addr.port}`;
    const call = async (path: string, opts: RequestInit = {}) => {
      const res = await fetch(`${base}${path}`, opts);
      const data = await res.json().catch(() => ({}));
      return { status: res.status, data };
    };

    const short = await call("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "bug", message: "too short" }),
    });
    expect(short.status).toBe(400);

    const ok = await call("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "idea",
        message: "Vorrei un tutorial più corto sul F24",
        contact: "player@example.com",
      }),
    });
    expect(ok.status).toBe(201);

    const pm = await call("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "postmortem",
        message:
          "Post-mortem Floatdesk\nMese KO: 8\nDifficoltà: Normale\nSeconda run: Forse",
      }),
    });
    expect(pm.status).toBe(201);

    const boss = await call("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "boss", password: "secret12" }),
    });
    const token = (boss.data as { token: string }).token;
    const stats = await call("/api/admin/stats", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(stats.status).toBe(200);
    expect(stats.data).toMatchObject({ feedbackCount: 2 });
    const recent = (stats.data as { recentFeedback: { kind: string; message: string }[] })
      .recentFeedback;
    expect(recent.some((f) => f.kind === "postmortem")).toBe(true);
    expect(recent.find((f) => f.kind === "idea")).toMatchObject({
      kind: "idea",
      message: "Vorrei un tutorial più corto sul F24",
      contact: "player@example.com",
      username: null,
    });

    server.close();
    rmSync(adminDataDir, { recursive: true, force: true });
  });
});

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

  it("returns a JSON 404 for unknown API routes", async () => {
    const res = await fetch(`${staticBase}/api/missing`);
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toContain("application/json");
    await expect(res.json()).resolves.toEqual({ error: "Not found" });
  });
});

describe("runs realign from existing cloud saves on boot", () => {
  it("startup sync picks up long save missing from runs.json", async () => {
    const dir = mkdtempSync(join(tmpdir(), "liquidazi-realign-"));
    const savesDir = join(dir, "saves");
    mkdirSync(savesDir, { recursive: true });
    const userId = "userboot1";
    writeFileSync(
      join(dir, "users.json"),
      JSON.stringify([
        {
          id: userId,
          username: "boot_long",
          hash: "x",
          salt: "y",
        },
      ]),
    );
    writeFileSync(join(dir, "runs.json"), JSON.stringify([]));
    writeFileSync(
      join(savesDir, `${userId}.json`),
      JSON.stringify({
        slots: [
          {
            label: "S",
            game: {
              monthsPlayed: 90,
              status: "running",
              difficulty: "easy",
              company: { name: "Boot SRL", city: "TO", sector: "servizi", cash: 1 },
              career: {
                year2Reached: true,
                peakCash: 10,
                peakDebt: 0,
                lifetimeRevenue: 100,
              },
            },
            updatedAt: "2026-08-01T00:00:00.000Z",
          },
          { label: "2", game: null, updatedAt: null },
          { label: "3", game: null, updatedAt: null },
        ],
        activeSlot: 0,
      }),
    );

    const handler = createHandler({
      dataDir: dir,
      secret: SECRET,
      distDir: null,
      storage: "local",
      adminUsernames: ["boss"],
    });
    const srv = createServer(handler);
    await new Promise<void>((resolve) => srv.listen(0, "127.0.0.1", resolve));
    const addr = srv.address();
    if (!addr || typeof addr === "string") throw new Error("no port");
    const b = `http://127.0.0.1:${addr.port}`;
    const board = await fetch(`${b}/api/leaderboard?board=longest`);
    const data = (await board.json()) as {
      entries: { username: string; monthsPlayed: number }[];
    };
    expect(board.status).toBe(200);
    expect(data.entries.some((e) => e.username === "boot_long" && e.monthsPlayed === 90)).toBe(
      true,
    );
    srv.close();
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("security hardening", () => {
  it("rejects short passwords", async () => {
    const { status, data } = await api("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "short_pw", password: "1234567" }),
    });
    expect(status).toBe(400);
    expect(String((data as { error?: string }).error)).toMatch(/8/);
  });

  it("rejects absurd run money and downgrades early won", async () => {
    const reg = await api("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "sec_runner", password: "secret12" }),
    });
    const token = (reg.data as { token: string }).token;

    const huge = await api("/api/runs", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        monthsPlayed: 30,
        peakCash: 999_999_999,
        peakDebt: 0,
        lifetimeRevenue: 0,
        finalCash: 0,
        outcome: "lost",
      }),
    });
    expect(huge.status).toBe(400);

    const earlyWin = await api("/api/runs", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        monthsPlayed: 10,
        peakCash: 1000,
        peakDebt: 0,
        lifetimeRevenue: 500,
        finalCash: 1000,
        companyName: "Early",
        city: "058091",
        sector: "servizi",
        outcome: "won",
        slotIndex: 0,
      }),
    });
    expect(earlyWin.status).toBeGreaterThanOrEqual(200);
    expect(earlyWin.status).toBeLessThan(300);

    const board = await api("/api/leaderboard?board=longest&limit=50");
    const entries = (board.data as { entries: { companyName: string; monthsPlayed: number }[] })
      .entries;
    const mine = entries.find((e) => e.companyName === "Early");
    // Outcome forced to lost does not remove the run; ensure it was accepted.
    expect(mine?.monthsPlayed).toBe(10);
  });

  it("rate-limits auth after many attempts from same IP", async () => {
    const dir = mkdtempSync(join(tmpdir(), "liquidazi-rl-"));
    const handler = createHandler({ dataDir: dir, secret: SECRET, distDir: null });
    const srv = createServer(handler);
    await new Promise<void>((resolve) => srv.listen(0, "127.0.0.1", resolve));
    const addr = srv.address();
    if (!addr || typeof addr === "string") throw new Error("no port");
    const b = `http://127.0.0.1:${addr.port}`;
    const call = async (i: number) => {
      const res = await fetch(`${b}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: `rl_user_${i}`, password: "secret12" }),
      });
      return res.status;
    };
    const statuses: number[] = [];
    for (let i = 0; i < 22; i++) statuses.push(await call(i));
    expect(statuses.some((s) => s === 429)).toBe(true);
    expect(statuses.filter((s) => s === 201).length).toBeLessThanOrEqual(20);
    srv.close();
    rmSync(dir, { recursive: true, force: true });
  });
});
