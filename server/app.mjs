/**
 * Liquidazi API — auth + leaderboard runs + cloud saves.
 * Zero deps: node:http, crypto, fs.
 */
import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  renameSync,
  createReadStream,
  statSync,
} from "node:fs";
import { join, extname, sep } from "node:path";

const MAX_SAVE_BYTES = 1_000_000;
const MAX_BODY_BYTES = 64_000;

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
  if (!full.startsWith(root + sep)) return null;
  return full;
};

const sendFile = (res, filePath) => {
  const ext = extname(filePath);
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
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
 * @param {{ dataDir: string, secret: string, distDir: string | null }} opts
 * @returns {(req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse) => void}
 */
export function createHandler({ dataDir, secret, distDir }) {
  mkdirSync(dataDir, { recursive: true });

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

  const savePath = (userId) => join(dataDir, "saves", `${userId}.json`);

  const loadUserSaves = (userId) => {
    const p = savePath(userId);
    if (!existsSync(p)) return emptySaves();
    try {
      return JSON.parse(readFileSync(p, "utf8"));
    } catch {
      return emptySaves();
    }
  };

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
    const sig = createHmac("sha256", secret).update(body).digest("hex");
    return `${body}.${sig}`;
  };

  const parseToken = (header) => {
    if (!header?.startsWith("Bearer ")) return null;
    const token = header.slice(7);
    const [userId, expStr, sig] = token.split(".");
    if (!userId || !expStr || !sig) return null;
    const body = `${userId}.${expStr}`;
    const expect = createHmac("sha256", secret).update(body).digest("hex");
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
      "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    });
    res.end(JSON.stringify(data));
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
        return json(res, 200, { token: makeToken(user.id), username: user.username });
      }

      if (req.method === "GET" && path === "/api/auth/me") {
        const user = parseToken(req.headers.authorization);
        if (!user) return json(res, 401, { error: "Non autenticato" });
        return json(res, 200, { username: user.username });
      }

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
        writeJson(savePath(user.id), payload);
        return json(res, 200, payload);
      }

      if (req.method === "POST" && path === "/api/runs") {
        const user = parseToken(req.headers.authorization);
        if (!user) return json(res, 401, { error: "Login richiesto" });
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

      if (path.startsWith("/api")) {
        return json(res, 404, { error: "Not found" });
      }

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
