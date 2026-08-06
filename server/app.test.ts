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
