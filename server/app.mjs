/**
 * Floatdesk API — auth + leaderboard runs + cloud saves.
 * Zero deps: node:http, crypto, fs.
 */
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  renameSync,
  createReadStream,
  readdirSync,
  statSync,
} from "node:fs";
import { join, extname, sep, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { computeBalance } from "./balance.mjs";
import { clientIp, createRateLimiter } from "./rateLimit.mjs";
import { extractRunFromGame, syncRunsFromSaves, upsertRun } from "./runSync.mjs";
import { robotsTxt, siteOrigin, sitemapXml } from "./seo.mjs";
import {
  DEFAULT_EVENT_LOG_LIMIT,
  appendEvent,
  requestPath,
  shouldSkipEvent,
  summarizeEvents,
} from "./eventLog.mjs";
import {
  makeSessionToken,
  readSessionToken,
  refreshSessionToken,
} from "./sessionToken.mjs";
import { historyMarket, quoteMarket, searchMarkets } from "./markets.mjs";

const MAX_SAVE_BYTES = 1_000_000;
const MAX_BODY_BYTES = 64_000;
const MAX_FEEDBACK = 200;
const MAX_FEEDBACK_MSG = 2_000;
const MIN_PASSWORD = 8;
/** Soft anti-cheat ceiling on self-reported money stats (€). */
const MAX_RUN_MONEY = 100_000_000;
const AUTH_RATE = { limit: 20, windowMs: 15 * 60 * 1000 };
const FEEDBACK_RATE = { limit: 8, windowMs: 60 * 60 * 1000 };
const FEEDBACK_KINDS = new Set(["bug", "idea", "postmortem"]);
const MILESTONE_IDS = new Set([
  "first_invoice",
  "first_f24",
  "first_month_profit",
  "first_close",
  "first_hire",
  "hire_impiegato",
  "hire_responsabile",
  "first_upgrade",
  "first_treasury",
  "survive_3",
  "cash_10k",
  "supply_stocked",
  "private_client",
  "survive_6",
  "first_loan",
  "dual_loans",
  "first_fido",
  "fido_drawn",
  "distress_loan",
  "first_project",
  "project_digitalizzazione",
  "project_magazzino",
  "project_formazione",
  "project_espansione",
  "staff_3",
  "staff_5",
  "holding_2",
  "holding_3",
  "cash_25k",
  "pa_client",
  "growth_reinvest",
  "compliance_100",
  "upgrade_gestionale",
  "upgrade_commerciale",
  "upgrade_sede",
  "upgrade_processi",
  "upgrade_any_l2",
  "revenue_50k",
  "rival_tesa",
  "demand_boom",
  "demand_secca",
  "cartella_open",
  "rateazione",
  "survive_12",
  "year1_profit",
  "first_acquisition",
  "compliance_80",
  "survive_24",
  "survive_36",
  "cash_100k",
  "staff_10",
  "holding_6",
  "holding_8",
  "upgrades_all_l1",
  "upgrade_any_l3",
  "growth_3_slots",
  "revenue_200k",
  "rival_guerra",
  "enforcement",
  "treasury_10k",
]);

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

const NOT_FOUND_HTML = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "notFound.html"),
  "utf8",
);

const isSpaPath = (reqPath) => {
  const n = reqPath.replace(/\/+$/, "") || "/";
  return n === "/privacy" || n === "/termini";
};

const sendNotFoundPage = (res, { head = false } = {}) => {
  res.writeHead(404, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-cache",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "DENY",
  });
  if (head) return res.end();
  res.end(NOT_FOUND_HTML);
};

const safeJoin = (root, reqPath) => {
  const decoded = decodeURIComponent(reqPath.split("?")[0]);
  const rel = decoded === "/" ? "/index.html" : decoded;
  const full = join(root, rel);
  if (!full.startsWith(root + sep)) return null;
  return full;
};

const cacheControlForFile = (filePath) => {
  const posix = filePath.replaceAll("\\", "/");
  if (posix.endsWith(".html")) return "no-cache";
  if (posix.includes("/assets/")) return "public, max-age=31536000, immutable";
  return "public, max-age=3600";
};

const sendFile = (res, filePath, { head = false } = {}) => {
  const ext = extname(filePath);
  res.writeHead(200, {
    "Content-Type": MIME[ext] || "application/octet-stream",
    "Cache-Control": cacheControlForFile(filePath),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "DENY",
  });
  if (head) return res.end();
  createReadStream(filePath).pipe(res);
};

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

/**
 * @param {{
 *   dataDir: string,
 *   secret: string,
 *   distDir: string | null,
 *   storage?: "volume" | "local",
 *   adminUsernames?: string[],
 *   eventLogLimit?: number,
 * }} opts
 * @returns {(req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse) => void}
 */
export function createHandler({
  dataDir,
  secret,
  distDir,
  storage = "local",
  adminUsernames = [],
  eventLogLimit = DEFAULT_EVENT_LOG_LIMIT,
}) {
  mkdirSync(dataDir, { recursive: true });
  const adminSet = new Set(
    adminUsernames.map((u) => String(u).trim().toLowerCase()).filter(Boolean),
  );
  const isAdmin = (user) => Boolean(user && adminSet.has(user.username.toLowerCase()));
  const rateLimit = createRateLimiter();

  const load = (name, fallback) => {
    const p = join(dataDir, name);
    if (!existsSync(p)) return fallback;
    try {
      return JSON.parse(readFileSync(p, "utf8"));
    } catch {
      return fallback;
    }
  };
  const writeJson = (path, data, space) => {
    const tmp = `${path}.tmp`;
    writeFileSync(tmp, JSON.stringify(data, null, space));
    renameSync(tmp, path);
  };
  const save = (name, data) => writeJson(join(dataDir, name), data, 2);

  /** @type {{ id: string, username: string, hash: string, salt: string }[]} */
  let users = load("users.json", []);
  /** @type {Run[]} */
  let runs = load("runs.json", []);
  /** @type {{ id: string, kind: string, message: string, contact: string | null, username: string | null, createdAt: string }[]} */
  let feedback = load("feedback.json", []);
  /** @type {{ id: string, at: string, method: string, path: string, status: number, username: string | null }[]} */
  let events = load("events.json", []);
  if (!Array.isArray(events)) events = [];

  const savePath = (userId) => join(dataDir, "saves", `${userId}.json`);
  const newRunId = () => randomBytes(8).toString("hex");

  const loadUserSaves = (userId) => {
    const p = savePath(userId);
    if (!existsSync(p)) return emptySaves();
    try {
      return JSON.parse(readFileSync(p, "utf8"));
    } catch {
      return emptySaves();
    }
  };

  /** Backfill / realign leaderboard from cloud saves (long runs past soft-win 24m). */
  const realignRunsFromSaves = () => {
    const result = syncRunsFromSaves(users, runs, loadUserSaves, newRunId);
    if (result.synced > 0) {
      runs = result.runs;
      save("runs.json", runs);
      console.info(
        `[liquidazi] runs realigned from saves: ${result.synced} upsert(s), ${result.touchedUsers} user(s)`,
      );
    }
    return result;
  };
  realignRunsFromSaves();

  const hashPassword = (password, salt = randomBytes(16).toString("hex")) => {
    const hash = scryptSync(password, salt, 32).toString("hex");
    return { hash, salt };
  };

  const checkPassword = (password, salt, hash) => {
    const h = scryptSync(password, salt, 32);
    const expected = Buffer.from(hash, "hex");
    return h.length === expected.length && timingSafeEqual(h, expected);
  };

  const authorize = (req) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) return null;
    const session = readSessionToken(header.slice(7), secret);
    if (!session) return null;
    const user = users.find((u) => u.id === session.userId) ?? null;
    if (!user) return null;
    return { user, session };
  };

  const recordEvent = (req, status) => {
    const method = req.method || "GET";
    const path = requestPath(new URL(req.url || "/", "http://local").pathname);
    if (shouldSkipEvent(method, path)) return;
    events = appendEvent(
      events,
      {
        id: randomBytes(8).toString("hex"),
        at: new Date().toISOString(),
        method,
        path,
        status: Number(status) || 0,
        username: authorize(req)?.user?.username ?? null,
      },
      eventLogLimit,
    );
    save("events.json", events);
  };

  const SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "DENY",
  };

  const json = (res, status, data, extraHeaders = {}) => {
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Expose-Headers": "X-Session-Token",
      ...SECURITY_HEADERS,
      ...extraHeaders,
    });
    res.end(JSON.stringify(data));
  };

  const jsonAuthed = (res, status, data, session, extraHeaders = {}) => {
    const token = refreshSessionToken(session, secret);
    return json(res, status, data, {
      ...(token ? { "X-Session-Token": token } : {}),
      ...extraHeaders,
    });
  };

  const readBodyLimited = (req, maxBytes) =>
    new Promise((resolve, reject) => {
      const chunks = [];
      let size = 0;
      let rejected = false;
      req.on("data", (c) => {
        size += c.length;
        if (!rejected && size > maxBytes) {
          rejected = true;
          reject(Object.assign(new Error("too large"), { code: "ENTITY_TOO_LARGE" }));
          return;
        }
        if (!rejected) chunks.push(c);
      });
      req.on("end", () => {
        if (rejected) return;
        try {
          resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {});
        } catch (e) {
          reject(e);
        }
      });
      req.on("error", reject);
    });

  const USER_RE = /^[a-zA-Z0-9_]{3,20}$/;

  const BOARDS = {
    longest: { key: "monthsPlayed", dir: -1, label: "Sopravvivenza più lunga" },
    shortest: { key: "monthsPlayed", dir: 1, label: "Run più corta (KO veloce)" },
    debt: { key: "peakDebt", dir: -1, label: "Debito più alto" },
    cash: { key: "peakCash", dir: -1, label: "Cassa al picco" },
    revenue: { key: "lifetimeRevenue", dir: -1, label: "Fatturato lifetime" },
  };

  return async (req, res) => {
    // ponytail: one writeHead hook instead of threading req into json/sendFile
    let recorded = false;
    const origWriteHead = res.writeHead;
    res.writeHead = function writeHeadLogged(status, ...args) {
      if (!recorded) {
        recorded = true;
        try {
          recordEvent(req, status);
        } catch {
          /* never break the response */
        }
      }
      return origWriteHead.call(this, status, ...args);
    };

    if (req.method === "OPTIONS") {
      return json(res, 204, {});
    }

    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const path = url.pathname;

    try {
      if (req.method === "GET" && path === "/api/health") {
        return json(res, 200, { ok: true, storage });
      }

      if (req.method === "GET" && path === "/api/markets/search") {
        const q = url.searchParams.get("q") ?? "";
        try {
          const data = await searchMarkets(q);
          return json(res, 200, data);
        } catch {
          return json(res, 502, { error: "Mercati non disponibili. Riprova tra poco." });
        }
      }

      if (req.method === "GET" && path.startsWith("/api/markets/quote/")) {
        const symbol = decodeURIComponent(path.slice("/api/markets/quote/".length)).trim();
        try {
          const data = await quoteMarket(symbol);
          return json(res, 200, data);
        } catch {
          return json(res, 502, { error: "Quotazione non disponibile." });
        }
      }

      if (req.method === "GET" && path.startsWith("/api/markets/history/")) {
        const symbol = decodeURIComponent(path.slice("/api/markets/history/".length)).trim();
        const range = url.searchParams.get("range") ?? "6mo";
        try {
          const data = await historyMarket(symbol, range);
          return json(res, 200, data);
        } catch {
          return json(res, 502, { error: "Storico non disponibile." });
        }
      }

      if (req.method === "POST" && path === "/api/auth/register") {
        const ip = clientIp(req);
        const rl = rateLimit.check(`auth:${ip}`, AUTH_RATE.limit, AUTH_RATE.windowMs);
        if (!rl.ok) {
          return json(
            res,
            429,
            { error: "Troppi tentativi. Riprova tra poco." },
            { "Retry-After": String(rl.retryAfterSec) },
          );
        }
        let body;
        try {
          body = await readBodyLimited(req, MAX_BODY_BYTES);
        } catch (e) {
          return json(
            res,
            e && e.code === "ENTITY_TOO_LARGE" ? 413 : 400,
            { error: e && e.code === "ENTITY_TOO_LARGE" ? "Richiesta troppo grande" : "JSON non valido" },
          );
        }
        const username = String(body.username || "").trim();
        const password = String(body.password || "");
        if (!USER_RE.test(username)) {
          return json(res, 400, { error: "Username: 3–20 caratteri, lettere/numeri/_" });
        }
        if (password.length < MIN_PASSWORD) {
          return json(res, 400, { error: `Password minimo ${MIN_PASSWORD} caratteri` });
        }
        if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
          return json(res, 409, { error: "Username già preso" });
        }
        const { hash, salt } = hashPassword(password);
        const user = { id: randomBytes(8).toString("hex"), username, hash, salt };
        users.push(user);
        save("users.json", users);
        return json(res, 201, {
          token: makeSessionToken(user.id, secret),
          username: user.username,
          admin: isAdmin(user),
        });
      }

      if (req.method === "POST" && path === "/api/auth/login") {
        const ip = clientIp(req);
        const rl = rateLimit.check(`auth:${ip}`, AUTH_RATE.limit, AUTH_RATE.windowMs);
        if (!rl.ok) {
          return json(
            res,
            429,
            { error: "Troppi tentativi. Riprova tra poco." },
            { "Retry-After": String(rl.retryAfterSec) },
          );
        }
        let body;
        try {
          body = await readBodyLimited(req, MAX_BODY_BYTES);
        } catch (e) {
          return json(
            res,
            e && e.code === "ENTITY_TOO_LARGE" ? 413 : 400,
            { error: e && e.code === "ENTITY_TOO_LARGE" ? "Richiesta troppo grande" : "JSON non valido" },
          );
        }
        const username = String(body.username || "").trim();
        const password = String(body.password || "");
        const user = users.find((u) => u.username.toLowerCase() === username.toLowerCase());
        if (!user || !checkPassword(password, user.salt, user.hash)) {
          return json(res, 401, { error: "Credenziali non valide" });
        }
        return json(res, 200, {
          token: makeSessionToken(user.id, secret),
          username: user.username,
          admin: isAdmin(user),
        });
      }

      if (req.method === "GET" && path === "/api/auth/me") {
        const authz = authorize(req);
        if (!authz) return json(res, 401, { error: "Non autenticato" });
        const { user, session } = authz;
        return jsonAuthed(res, 200, {
          username: user.username,
          admin: isAdmin(user),
          achievements: Array.isArray(user.achievements) ? user.achievements : [],
        }, session);
      }

      if (req.method === "POST" && path === "/api/auth/achievements") {
        const authz = authorize(req);
        if (!authz) return json(res, 401, { error: "Non autenticato" });
        const { user, session } = authz;
        let body;
        try {
          body = await readBodyLimited(req, MAX_BODY_BYTES);
        } catch (e) {
          return json(
            res,
            e && e.code === "ENTITY_TOO_LARGE" ? 413 : 400,
            { error: e && e.code === "ENTITY_TOO_LARGE" ? "Richiesta troppo grande" : "JSON non valido" },
          );
        }
        const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
        const filtered = ids.filter((id) => MILESTONE_IDS.has(id));
        const prev = Array.isArray(user.achievements) ? user.achievements : [];
        const merged = [...new Set([...prev, ...filtered])];
        user.achievements = merged;
        const idx = users.findIndex((u) => u.id === user.id);
        if (idx >= 0) users[idx] = user;
        save("users.json", users);
        return jsonAuthed(res, 200, { achievements: merged }, session);
      }

      if (req.method === "GET" && path === "/api/admin/stats") {
        const authz = authorize(req);
        if (!authz) return json(res, 401, { error: "Non autenticato" });
        const { user, session } = authz;
        if (!isAdmin(user)) return jsonAuthed(res, 403, { error: "Solo admin" }, session);

        const now = Date.now();
        const dayMs = 86_400_000;
        const runs24h = runs.filter((r) => now - Date.parse(r.createdAt) < dayMs).length;
        const runs7d = runs.filter((r) => now - Date.parse(r.createdAt) < 7 * dayMs).length;
        const avgMonths =
          runs.length === 0
            ? 0
            : Math.round(
                (runs.reduce((s, r) => s + r.monthsPlayed, 0) / runs.length) * 10,
              ) / 10;
        const longest = runs.reduce((m, r) => Math.max(m, r.monthsPlayed), 0);

        const savesDir = join(dataDir, "saves");
        let cloudSaves = 0;
        let dataBytes = 0;
        const sizeOf = (p) => {
          try {
            return statSync(p).size;
          } catch {
            return 0;
          }
        };
        for (const name of ["users.json", "runs.json", "feedback.json", "events.json"]) {
          dataBytes += sizeOf(join(dataDir, name));
        }
        if (existsSync(savesDir)) {
          for (const name of readdirSync(savesDir)) {
            if (!name.endsWith(".json")) continue;
            cloudSaves += 1;
            dataBytes += sizeOf(join(savesDir, name));
          }
        }

        const recent = [...runs]
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, 40)
          .map((r) => ({
            id: r.id,
            username: r.username,
            companyName: r.companyName,
            city: r.city,
            monthsPlayed: r.monthsPlayed,
            outcome: r.outcome ?? null,
            difficulty: r.difficulty ?? null,
            createdAt: r.createdAt,
          }));

        const recentFeedback = [...feedback]
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, 10);

        return jsonAuthed(res, 200, {
          users: users.length,
          runs: runs.length,
          runs24h,
          runs7d,
          cloudSaves,
          avgMonths,
          longestMonths: longest,
          dataBytes,
          storage,
          recent,
          feedbackCount: feedback.length,
          recentFeedback,
          balance: computeBalance(runs),
          ...summarizeEvents(events),
        }, session);
      }

      if (req.method === "DELETE" && path.startsWith("/api/admin/runs/")) {
        const authz = authorize(req);
        if (!authz) return json(res, 401, { error: "Non autenticato" });
        const { user, session } = authz;
        if (!isAdmin(user)) return jsonAuthed(res, 403, { error: "Solo admin" }, session);
        const runId = decodeURIComponent(path.slice("/api/admin/runs/".length)).trim();
        if (!runId || runId.includes("/")) {
          return json(res, 400, { error: "id run non valido" });
        }
        const before = runs.length;
        runs = runs.filter((r) => r.id !== runId);
        if (runs.length === before) {
          return json(res, 404, { error: "Run non trovata" });
        }
        save("runs.json", runs);
        return jsonAuthed(res, 200, { ok: true, id: runId, runs: runs.length }, session);
      }

      if (req.method === "POST" && path === "/api/feedback") {
        const ip = clientIp(req);
        const rl = rateLimit.check(`feedback:${ip}`, FEEDBACK_RATE.limit, FEEDBACK_RATE.windowMs);
        if (!rl.ok) {
          return json(
            res,
            429,
            { error: "Troppi feedback. Riprova più tardi." },
            { "Retry-After": String(rl.retryAfterSec) },
          );
        }
        const authz = req.headers.authorization ? authorize(req) : null;
        const user = authz?.user ?? null;
        const session = authz?.session ?? null;
        let body;
        try {
          body = await readBodyLimited(req, MAX_BODY_BYTES);
        } catch (e) {
          return json(
            res,
            e && e.code === "ENTITY_TOO_LARGE" ? 413 : 400,
            { error: e && e.code === "ENTITY_TOO_LARGE" ? "Richiesta troppo grande" : "JSON non valido" },
          );
        }
        const kind = String(body.kind || "").trim();
        const message = String(body.message || "").trim();
        const contact = String(body.contact || "").trim().slice(0, 80);
        if (!FEEDBACK_KINDS.has(kind)) {
          return json(res, 400, { error: "Tipo non valido (bug, idea o postmortem)" });
        }
        if (message.length < 10) {
          return json(res, 400, { error: "Messaggio troppo corto (min 10 caratteri)" });
        }
        if (message.length > MAX_FEEDBACK_MSG) {
          return json(res, 400, { error: `Messaggio troppo lungo (max ${MAX_FEEDBACK_MSG})` });
        }
        const entry = {
          id: randomBytes(8).toString("hex"),
          kind,
          message,
          contact: contact || null,
          username: user?.username ?? null,
          createdAt: new Date().toISOString(),
        };
        feedback.push(entry);
        if (feedback.length > MAX_FEEDBACK) {
          feedback = feedback.slice(-MAX_FEEDBACK);
        }
        save("feedback.json", feedback);
        if (session) return jsonAuthed(res, 201, { id: entry.id }, session);
        return json(res, 201, { id: entry.id });
      }

      if (req.method === "GET" && path === "/api/saves") {
        const authz = authorize(req);
        if (!authz) return json(res, 401, { error: "Non autenticato" });
        const { user, session } = authz;
        return jsonAuthed(res, 200, loadUserSaves(user.id), session);
      }

      if (req.method === "PUT" && path === "/api/saves") {
        const authz = authorize(req);
        if (!authz) return json(res, 401, { error: "Non autenticato" });
        const { user, session } = authz;
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
        writeJson(savePath(user.id), payload);
        // Keep leaderboard/dashboard in sync for continued / long runs.
        const slots = Array.isArray(payload.slots) ? payload.slots : [];
        let changed = false;
        for (let i = 0; i < slots.length; i++) {
          const extracted = extractRunFromGame(slots[i]?.game, user, i);
          if (!extracted) continue;
          const result = upsertRun(runs, extracted, newRunId);
          runs = result.runs;
          if (result.upserted) changed = true;
        }
        if (changed) save("runs.json", runs);
        return jsonAuthed(res, 200, payload, session);
      }

      if (req.method === "POST" && path === "/api/admin/resync-runs") {
        const authz = authorize(req);
        if (!authz) return json(res, 401, { error: "Non autenticato" });
        const { user, session } = authz;
        if (!isAdmin(user)) return jsonAuthed(res, 403, { error: "Solo admin" }, session);
        const result = realignRunsFromSaves();
        return jsonAuthed(res, 200, {
          synced: result.synced,
          touchedUsers: result.touchedUsers,
          runs: runs.length,
        }, session);
      }

      if (req.method === "POST" && path === "/api/runs") {
        const authz = authorize(req);
        if (!authz) return json(res, 401, { error: "Login richiesto" });
        const { user, session } = authz;
        let body;
        try {
          body = await readBodyLimited(req, MAX_BODY_BYTES);
        } catch (e) {
          return json(
            res,
            e && e.code === "ENTITY_TOO_LARGE" ? 413 : 400,
            { error: e && e.code === "ENTITY_TOO_LARGE" ? "Richiesta troppo grande" : "JSON non valido" },
          );
        }
        const monthsPlayed = Number(body.monthsPlayed);
        const peakCash = Number(body.peakCash);
        const peakDebt = Number(body.peakDebt);
        const lifetimeRevenue = Number(body.lifetimeRevenue);
        const finalCash = Number(body.finalCash);
        if (
          !Number.isFinite(monthsPlayed) ||
          monthsPlayed < 1 ||
          monthsPlayed > 2400 ||
          !Number.isFinite(peakCash) ||
          !Number.isFinite(peakDebt) ||
          !Number.isFinite(lifetimeRevenue) ||
          !Number.isFinite(finalCash) ||
          Math.abs(peakCash) > MAX_RUN_MONEY ||
          Math.abs(peakDebt) > MAX_RUN_MONEY ||
          Math.abs(lifetimeRevenue) > MAX_RUN_MONEY ||
          Math.abs(finalCash) > MAX_RUN_MONEY
        ) {
          return json(res, 400, { error: "Stats non valide" });
        }
        const DIFFS = new Set(["easy", "normal", "hard"]);
        const difficultyRaw = String(body.difficulty || "").trim().toLowerCase();
        const difficulty = DIFFS.has(difficultyRaw) ? difficultyRaw : null;
        const outcomeRaw = String(body.outcome || "lost").trim().toLowerCase();
        // Soft-win is 24 months; reject forged early "won" submissions.
        let outcome = outcomeRaw === "won" ? "won" : "lost";
        if (outcome === "won" && monthsPlayed < 24) {
          outcome = "lost";
        }
        const slotRaw = Number(body.slotIndex);
        const slotIndex =
          Number.isInteger(slotRaw) && slotRaw >= 0 && slotRaw <= 2 ? slotRaw : null;
        const candidate = {
          userId: user.id,
          username: user.username,
          companyName: String(body.companyName || "SRL").slice(0, 40),
          city: String(body.city || "").slice(0, 12),
          sector: String(body.sector || "").slice(0, 20),
          monthsPlayed: Math.round(monthsPlayed),
          peakCash: Math.round(peakCash * 100) / 100,
          peakDebt: Math.round(peakDebt * 100) / 100,
          lifetimeRevenue: Math.round(lifetimeRevenue * 100) / 100,
          finalCash: Math.round(finalCash * 100) / 100,
          difficulty,
          outcome,
          slotIndex,
          source: "end",
        };
        const result = upsertRun(runs, candidate, newRunId);
        runs = result.runs;
        save("runs.json", runs);
        return jsonAuthed(res, result.upserted ? 201 : 200, { id: result.id, upserted: result.upserted }, session);
      }

      if (req.method === "GET" && path === "/api/leaderboard") {
        const board = url.searchParams.get("board") || "longest";
        const conf = BOARDS[board];
        if (!conf) return json(res, 400, { error: "Board sconosciuta", boards: Object.keys(BOARDS) });
        const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 20)));

        // Keep only the best run per user for this board
        const bestByUser = new Map();
        for (const r of runs) {
          const prev = bestByUser.get(r.userId);
          if (!prev) { bestByUser.set(r.userId, r); continue; }
          const rv = r[conf.key];
          const pv = prev[conf.key];
          const better = rv === pv
            ? r.createdAt > prev.createdAt
            : conf.dir * (rv < pv ? -1 : 1) < 0;
          if (better) bestByUser.set(r.userId, r);
        }

        const sorted = [...bestByUser.values()].sort((a, b) => {
          const av = a[conf.key];
          const bv = b[conf.key];
          if (av === bv) return b.createdAt.localeCompare(a.createdAt);
          return conf.dir * (av < bv ? -1 : 1);
        });
        return json(res, 200, {
          board,
          label: conf.label,
          entries: sorted.slice(0, limit).map((r, i) => ({
            rank: i + 1,
            username: r.username,
            companyName: r.companyName,
            city: r.city,
            sector: r.sector,
            monthsPlayed: r.monthsPlayed,
            peakCash: r.peakCash,
            peakDebt: r.peakDebt,
            lifetimeRevenue: r.lifetimeRevenue,
            finalCash: r.finalCash,
            outcome: r.outcome ?? "lost",
            createdAt: r.createdAt,
          })),
        });
      }

      if (req.method === "GET" && path === "/api/runs/me") {
        const authz = authorize(req);
        if (!authz) return json(res, 401, { error: "Login richiesto" });
        const { user, session } = authz;
        const mine = runs
          .filter((r) => r.userId === user.id)
          .sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt))
          .map((r) => ({
            id: r.id,
            companyName: r.companyName,
            city: r.city,
            sector: r.sector,
            monthsPlayed: r.monthsPlayed,
            peakCash: r.peakCash,
            peakDebt: r.peakDebt,
            lifetimeRevenue: r.lifetimeRevenue,
            finalCash: r.finalCash,
            difficulty: r.difficulty ?? null,
            outcome: r.outcome ?? "lost",
            slotIndex: r.slotIndex ?? null,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt ?? null,
          }));
        return jsonAuthed(res, 200, { runs: mine }, session);
      }

      if (req.method === "GET" && path === "/api/leaderboard/boards") {
        return json(
          res,
          200,
          Object.entries(BOARDS).map(([id, b]) => ({ id, label: b.label })),
        );
      }

      if (path.startsWith("/api")) {
        return json(res, 404, { error: "Not found" });
      }

      if (req.method === "GET" || req.method === "HEAD") {
        if (path === "/robots.txt" || path === "/sitemap.xml") {
          const host = req.headers["x-forwarded-host"] || req.headers.host;
          const forwardedProto = req.headers["x-forwarded-proto"];
          const origin = siteOrigin({
            host: typeof host === "string" ? host : undefined,
            forwardedProto:
              typeof forwardedProto === "string" ? forwardedProto : undefined,
          });
          const body =
            path === "/robots.txt" ? robotsTxt(origin) : sitemapXml(origin);
          const type =
            path === "/robots.txt"
              ? "text/plain; charset=utf-8"
              : "application/xml; charset=utf-8";
          res.writeHead(200, {
            "Content-Type": type,
            "Cache-Control": "public, max-age=3600",
            "X-Content-Type-Options": "nosniff",
          });
          if (req.method === "HEAD") return res.end();
          return res.end(body);
        }
      }

      if (distDir && (req.method === "GET" || req.method === "HEAD")) {
        if (path === "/ops" || path === "/ops/") {
          const opsPath = join(distDir, "ops.html");
          try {
            if (statSync(opsPath).isFile()) {
              return sendFile(res, opsPath, { head: req.method === "HEAD" });
            }
          } catch {
            /* fall through */
          }
        }
        let filePath = safeJoin(distDir, path);
        const trySend = (p) => {
          try {
            const st = statSync(p);
            if (st.isFile()) {
              sendFile(res, p, { head: req.method === "HEAD" });
              return true;
            }
          } catch {
            /* missing */
          }
          return false;
        };
        if (filePath && trySend(filePath)) return;
        const indexPath = join(distDir, "index.html");
        if (isSpaPath(path) && trySend(indexPath)) return;
        return sendNotFoundPage(res, { head: req.method === "HEAD" });
      }

      if (req.method === "GET" || req.method === "HEAD") {
        return sendNotFoundPage(res, { head: req.method === "HEAD" });
      }

      return json(res, 404, { error: "Not found" });
    } catch (e) {
      console.error(e);
      return json(res, 500, { error: "Errore server" });
    }
  };
}

/**
 * @typedef {{
 *   id: string,
 *   userId: string,
 *   username: string,
 *   companyName: string,
 *   city: string,
 *   sector: string,
 *   monthsPlayed: number,
 *   peakCash: number,
 *   peakDebt: number,
 *   lifetimeRevenue: number,
 *   finalCash: number,
 *   createdAt: string,
 * }} Run
 */
