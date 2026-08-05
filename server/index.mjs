/**
 * Liquidazi API — auth + leaderboard runs.
 * Zero deps: node:http, crypto, fs.
 * Start: node server/index.mjs
 */
import { createServer } from "node:http";
import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dir, "data");
const PORT = Number(process.env.PORT || 8787);
const SECRET = process.env.LIQUIDAZI_SECRET || "liquidazi-dev-secret-change-me";

mkdirSync(DATA, { recursive: true });

const load = (name, fallback) => {
  const p = join(DATA, name);
  if (!existsSync(p)) return fallback;
  return JSON.parse(readFileSync(p, "utf8"));
};
const save = (name, data) => writeFileSync(join(DATA, name), JSON.stringify(data, null, 2));

/** @type {{ id: string, username: string, hash: string, salt: string }[]} */
let users = load("users.json", []);
/** @type {Run[]} */
let runs = load("runs.json", []);

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

const hashPassword = (password, salt = randomBytes(16).toString("hex")) => {
  const hash = scryptSync(password, salt, 32).toString("hex");
  return { hash, salt };
};

const checkPassword = (password, salt, hash) => {
  const h = scryptSync(password, salt, 32);
  const expected = Buffer.from(hash, "hex");
  return h.length === expected.length && timingSafeEqual(h, expected);
};

const makeToken = (userId) => {
  const exp = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const body = `${userId}.${exp}`;
  const sig = createHmac("sha256", SECRET).update(body).digest("hex");
  return `${body}.${sig}`;
};

const parseToken = (header) => {
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7);
  const [userId, expStr, sig] = token.split(".");
  if (!userId || !expStr || !sig) return null;
  const body = `${userId}.${expStr}`;
  const expect = createHmac("sha256", SECRET).update(body).digest("hex");
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  } catch {
    return null;
  }
  if (Date.now() > Number(expStr)) return null;
  return users.find((u) => u.id === userId) ?? null;
};

const json = (res, status, data) => {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  });
  res.end(JSON.stringify(data));
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
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

const createServerHandler = async (req, res) => {
  if (req.method === "OPTIONS") {
    return json(res, 204, {});
  }

  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const path = url.pathname;

  try {
    if (req.method === "GET" && path === "/api/health") {
      return json(res, 200, { ok: true });
    }

    if (req.method === "POST" && path === "/api/auth/register") {
      const body = await readBody(req);
      const username = String(body.username || "").trim();
      const password = String(body.password || "");
      if (!USER_RE.test(username)) {
        return json(res, 400, { error: "Username: 3–20 caratteri, lettere/numeri/_" });
      }
      if (password.length < 6) {
        return json(res, 400, { error: "Password minimo 6 caratteri" });
      }
      if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
        return json(res, 409, { error: "Username già preso" });
      }
      const { hash, salt } = hashPassword(password);
      const user = { id: randomBytes(8).toString("hex"), username, hash, salt };
      users.push(user);
      save("users.json", users);
      return json(res, 201, { token: makeToken(user.id), username: user.username });
    }

    if (req.method === "POST" && path === "/api/auth/login") {
      const body = await readBody(req);
      const username = String(body.username || "").trim();
      const password = String(body.password || "");
      const user = users.find((u) => u.username.toLowerCase() === username.toLowerCase());
      if (!user || !checkPassword(password, user.salt, user.hash)) {
        return json(res, 401, { error: "Credenziali non valide" });
      }
      return json(res, 200, { token: makeToken(user.id), username: user.username });
    }

    if (req.method === "GET" && path === "/api/auth/me") {
      const user = parseToken(req.headers.authorization);
      if (!user) return json(res, 401, { error: "Non autenticato" });
      return json(res, 200, { username: user.username });
    }

    if (req.method === "POST" && path === "/api/runs") {
      const user = parseToken(req.headers.authorization);
      if (!user) return json(res, 401, { error: "Login richiesto" });
      const body = await readBody(req);
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
        !Number.isFinite(finalCash)
      ) {
        return json(res, 400, { error: "Stats non valide" });
      }
      /** @type {Run} */
      const run = {
        id: randomBytes(8).toString("hex"),
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
        createdAt: new Date().toISOString(),
      };
      runs.push(run);
      save("runs.json", runs);
      return json(res, 201, { id: run.id });
    }

    if (req.method === "GET" && path === "/api/leaderboard") {
      const board = url.searchParams.get("board") || "longest";
      const conf = BOARDS[board];
      if (!conf) return json(res, 400, { error: "Board sconosciuta", boards: Object.keys(BOARDS) });
      const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 20)));
      const sorted = [...runs].sort((a, b) => {
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
          createdAt: r.createdAt,
        })),
      });
    }

    if (req.method === "GET" && path === "/api/leaderboard/boards") {
      return json(
        res,
        200,
        Object.entries(BOARDS).map(([id, b]) => ({ id, label: b.label })),
      );
    }

    return json(res, 404, { error: "Not found" });
  } catch (e) {
    console.error(e);
    return json(res, 500, { error: "Errore server" });
  }
};

createServer(createServerHandler).listen(PORT, () => {
  console.log(`Liquidazi API on http://127.0.0.1:${PORT}`);
});
