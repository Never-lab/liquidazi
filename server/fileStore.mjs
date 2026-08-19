import { randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { extractRunFromGame, syncRunsFromSaves, upsertRun } from "./runSync.mjs";
import { appendEvent } from "./eventLog.mjs";
import { createLock, emptySaves } from "./storeShared.mjs";

const MAX_FEEDBACK = 200;

/**
 * @param {string} dataDir
 * @param {import("./storeShared.mjs").StorageMode} storage
 */
export function createFileStore(dataDir, storage = "local") {
  mkdirSync(dataDir, { recursive: true });
  const withLock = createLock();

  const loadJson = (path, fallback) => {
    if (!existsSync(path)) return fallback;
    try {
      return JSON.parse(readFileSync(path, "utf8"));
    } catch (err) {
      console.error(`[liquidazi] corrupt JSON at ${path}:`, err);
      throw new Error(`Storage corrupt: ${path}`);
    }
  };

  const writeJson = (path, data, space = 2) => {
    const tmp = `${path}.tmp`;
    writeFileSync(tmp, JSON.stringify(data, null, space));
    renameSync(tmp, path);
  };

  const savePath = (name) => join(dataDir, name);
  const userSavePath = (userId) => join(dataDir, "saves", `${userId}.json`);

  /** @type {{ id: string, username: string, hash: string, salt: string, achievements?: string[] }[]} */
  let users = [];
  /** @type {object[]} */
  let runs = [];
  /** @type {object[]} */
  let feedback = [];
  /** @type {object[]} */
  let events = [];

  const persistUsers = () => withLock(async () => {
    writeJson(savePath("users.json"), users);
  });

  const persistRuns = () => withLock(async () => {
    writeJson(savePath("runs.json"), runs);
  });

  const persistFeedback = () => withLock(async () => {
    writeJson(savePath("feedback.json"), feedback);
  });

  const persistEvents = () => withLock(async () => {
    writeJson(savePath("events.json"), events);
  });

  const loadUserSavesSync = (userId) => {
    const p = userSavePath(userId);
    if (!existsSync(p)) return emptySaves();
    try {
      return JSON.parse(readFileSync(p, "utf8"));
    } catch (err) {
      console.error(`[liquidazi] corrupt save for ${userId}:`, err);
      throw new Error(`Save corrupt for user ${userId}`);
    }
  };

  const realignRunsFromSaves = async () => {
    const result = syncRunsFromSaves(users, runs, loadUserSavesSync, newRunId);
    if (result.synced > 0) {
      runs = result.runs;
      await persistRuns();
      console.info(
        `[liquidazi] runs realigned from saves: ${result.synced} upsert(s), ${result.touchedUsers} user(s)`,
      );
    }
    return { synced: result.synced, touchedUsers: result.touchedUsers, runs: runs.length };
  };

  const newRunId = () => randomBytes(8).toString("hex");

  return {
    storage,

    async ready() {
      users = loadJson(savePath("users.json"), []);
      runs = loadJson(savePath("runs.json"), []);
      feedback = loadJson(savePath("feedback.json"), []);
      events = loadJson(savePath("events.json"), []);
      if (!Array.isArray(events)) events = [];
      await realignRunsFromSaves();
    },

    async close() {},

    async listUsers() {
      return [...users];
    },

    async findUserByUsername(username) {
      const lower = username.toLowerCase();
      return users.find((u) => u.username.toLowerCase() === lower) ?? null;
    },

    async findUserById(id) {
      return users.find((u) => u.id === id) ?? null;
    },

    async insertUser(user) {
      users.push(user);
      await persistUsers();
    },

    async updateUser(user) {
      const idx = users.findIndex((u) => u.id === user.id);
      if (idx >= 0) users[idx] = user;
      await persistUsers();
    },

    async loadUserSaves(userId) {
      return loadUserSavesSync(userId);
    },

    async putUserSavesWithRunSync(user, payload, newRunIdFn) {
      await withLock(async () => {
        mkdirSync(join(dataDir, "saves"), { recursive: true });
        writeJson(userSavePath(user.id), payload, 0);
        const slots = Array.isArray(payload.slots) ? payload.slots : [];
        let changed = false;
        for (let i = 0; i < slots.length; i++) {
          const extracted = extractRunFromGame(slots[i]?.game, user, i);
          if (!extracted) continue;
          const result = upsertRun(runs, extracted, newRunIdFn);
          runs = result.runs;
          if (result.upserted) changed = true;
        }
        if (changed) writeJson(savePath("runs.json"), runs);
      });
    },

    async upsertRunFromCandidate(candidate, newRunIdFn) {
      return withLock(async () => {
        const result = upsertRun(runs, candidate, newRunIdFn);
        runs = result.runs;
        if (result.upserted) writeJson(savePath("runs.json"), runs);
        return { upserted: result.upserted, id: result.id };
      });
    },

    async listRuns() {
      return [...runs];
    },

    async deleteRunById(runId) {
      return withLock(async () => {
        const before = runs.length;
        runs = runs.filter((r) => r.id !== runId);
        if (runs.length === before) return false;
        writeJson(savePath("runs.json"), runs);
        return true;
      });
    },

    async realignRunsFromSaves() {
      return withLock(realignRunsFromSaves);
    },

    async listFeedback() {
      return [...feedback];
    },

    async addFeedback(entry) {
      feedback.push(entry);
      if (feedback.length > MAX_FEEDBACK) {
        feedback = feedback.slice(-MAX_FEEDBACK);
      }
      await persistFeedback();
    },

    async listEvents() {
      return [...events];
    },

    async recordEvent(entry, limit) {
      events = appendEvent(events, entry, limit);
      await persistEvents();
    },

    async countCloudSaves() {
      const savesDir = join(dataDir, "saves");
      if (!existsSync(savesDir)) return 0;
      return readdirSync(savesDir).filter((n) => n.endsWith(".json")).length;
    },

    async estimateDataBytes() {
      let dataBytes = 0;
      const sizeOf = (p) => {
        try {
          return statSync(p).size;
        } catch {
          return 0;
        }
      };
      for (const name of ["users.json", "runs.json", "feedback.json", "events.json"]) {
        dataBytes += sizeOf(savePath(name));
      }
      const savesDir = join(dataDir, "saves");
      if (existsSync(savesDir)) {
        for (const name of readdirSync(savesDir)) {
          if (!name.endsWith(".json")) continue;
          dataBytes += sizeOf(join(savesDir, name));
        }
      }
      return dataBytes;
    },
  };
}
