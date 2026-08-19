import pg from "pg";
import { randomBytes } from "node:crypto";
import { extractRunFromGame, upsertRun } from "./runSync.mjs";
import { emptySaves } from "./storeShared.mjs";
import {
  SCHEMA_SQL,
  UPSERT_RUN_SQL,
  runFromRow,
  runToColumns,
} from "./pgSchema.mjs";

const { Pool } = pg;
const MAX_FEEDBACK = 200;

/**
 * @param {string} databaseUrl
 */
export function createPgStore(databaseUrl) {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 10,
    ssl: /sslmode=require|railway\.app/i.test(databaseUrl)
      ? { rejectUnauthorized: false }
      : undefined,
  });

  const persistRun = async (client, run) => {
    const c = runToColumns(run);
    await client.query(UPSERT_RUN_SQL, [
      c.id,
      c.user_id,
      c.username,
      c.company_name,
      c.city,
      c.sector,
      c.months_played,
      c.peak_cash,
      c.peak_debt,
      c.lifetime_revenue,
      c.final_cash,
      c.difficulty,
      c.outcome,
      c.slot_index,
      c.source,
      c.created_at,
      c.updated_at,
    ]);
  };

  const loadUserSavesFromDb = async (client, userId) => {
    const res = await client.query("SELECT payload FROM saves WHERE user_id = $1", [userId]);
    if (!res.rows[0]) return emptySaves();
    return res.rows[0].payload;
  };

  const realignRunsFromSavesTx = async (client) => {
    const usersRes = await client.query(
      "SELECT id, username, hash, salt, achievements FROM users ORDER BY username",
    );
    const users = usersRes.rows.map((row) => ({
      id: row.id,
      username: row.username,
      hash: row.hash,
      salt: row.salt,
      achievements: row.achievements ?? [],
    }));
    const runsRes = await client.query("SELECT * FROM runs");
    let runs = runsRes.rows.map(runFromRow);
    let synced = 0;
    let touchedUsers = 0;
    for (const user of users) {
      const saves = await loadUserSavesFromDb(client, user.id);
      const slots = Array.isArray(saves?.slots) ? saves.slots : [];
      let userTouched = false;
      for (let i = 0; i < slots.length; i++) {
        const extracted = extractRunFromGame(slots[i]?.game, user, i);
        if (!extracted) continue;
        const upsert = upsertRun(runs, extracted, () => randomBytes(8).toString("hex"));
        runs = upsert.runs;
        if (upsert.upserted) {
          synced += 1;
          userTouched = true;
          const run = runs.find((r) => r.id === upsert.id);
          if (run) await persistRun(client, run);
        }
      }
      if (userTouched) touchedUsers += 1;
    }
    return { synced, touchedUsers, runs: runs.length };
  };

  return {
    storage: /** @type {const} */ ("postgres"),

    async ready() {
      await pool.query(SCHEMA_SQL);
      const result = await this.realignRunsFromSaves();
      if (result.synced > 0) {
        console.info(
          `[liquidazi] runs realigned from saves: ${result.synced} upsert(s), ${result.touchedUsers} user(s)`,
        );
      }
    },

    async close() {
      await pool.end();
    },

    async listUsers() {
      const res = await pool.query(
        "SELECT id, username, hash, salt, achievements FROM users ORDER BY username",
      );
      return res.rows.map((row) => ({
        id: row.id,
        username: row.username,
        hash: row.hash,
        salt: row.salt,
        achievements: row.achievements ?? [],
      }));
    },

    async findUserByUsername(username) {
      const res = await pool.query(
        "SELECT id, username, hash, salt, achievements FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1",
        [username],
      );
      const row = res.rows[0];
      if (!row) return null;
      return {
        id: row.id,
        username: row.username,
        hash: row.hash,
        salt: row.salt,
        achievements: row.achievements ?? [],
      };
    },

    async findUserById(id) {
      const res = await pool.query(
        "SELECT id, username, hash, salt, achievements FROM users WHERE id = $1 LIMIT 1",
        [id],
      );
      const row = res.rows[0];
      if (!row) return null;
      return {
        id: row.id,
        username: row.username,
        hash: row.hash,
        salt: row.salt,
        achievements: row.achievements ?? [],
      };
    },

    async insertUser(user) {
      await pool.query(
        "INSERT INTO users (id, username, hash, salt, achievements) VALUES ($1, $2, $3, $4, $5)",
        [user.id, user.username, user.hash, user.salt, user.achievements ?? []],
      );
    },

    async updateUser(user) {
      await pool.query(
        "UPDATE users SET username = $2, hash = $3, salt = $4, achievements = $5 WHERE id = $1",
        [
          user.id,
          user.username,
          user.hash,
          user.salt,
          JSON.stringify(user.achievements ?? []),
        ],
      );
    },

    async loadUserSaves(userId) {
      const res = await pool.query("SELECT payload FROM saves WHERE user_id = $1", [userId]);
      if (!res.rows[0]) return emptySaves();
      return res.rows[0].payload;
    },

    async putUserSavesWithRunSync(user, payload, newRunIdFn) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          `INSERT INTO saves (user_id, payload, updated_at)
           VALUES ($1, $2, now())
           ON CONFLICT (user_id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()`,
          [user.id, payload],
        );
        const runsRes = await client.query("SELECT * FROM runs");
        let runs = runsRes.rows.map(runFromRow);
        const slots = Array.isArray(payload.slots) ? payload.slots : [];
        for (let i = 0; i < slots.length; i++) {
          const extracted = extractRunFromGame(slots[i]?.game, user, i);
          if (!extracted) continue;
          const result = upsertRun(runs, extracted, newRunIdFn);
          runs = result.runs;
          if (result.upserted) {
            await persistRun(client, runs.find((r) => r.id === result.id));
          }
        }
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },

    async upsertRunFromCandidate(candidate, newRunIdFn) {
      const runsRes = await pool.query("SELECT * FROM runs");
      const runs = runsRes.rows.map(runFromRow);
      const result = upsertRun(runs, candidate, newRunIdFn);
      if (!result.upserted) return { upserted: false, id: result.id };
      const run = result.runs.find((r) => r.id === result.id);
      if (!run) throw new Error("upsertRun missing run");
      await persistRun(pool, run);
      return { upserted: true, id: result.id };
    },

    async listRuns() {
      const res = await pool.query("SELECT * FROM runs ORDER BY created_at DESC");
      return res.rows.map(runFromRow);
    },

    async deleteRunById(runId) {
      const res = await pool.query("DELETE FROM runs WHERE id = $1", [runId]);
      return (res.rowCount ?? 0) > 0;
    },

    async realignRunsFromSaves() {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await realignRunsFromSavesTx(client);
        await client.query("COMMIT");
        return result;
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },

    async listFeedback() {
      const res = await pool.query("SELECT * FROM feedback ORDER BY created_at DESC");
      return res.rows.map((row) => ({
        id: row.id,
        kind: row.kind,
        message: row.message,
        contact: row.contact,
        username: row.username,
        createdAt: new Date(row.created_at).toISOString(),
      }));
    },

    async addFeedback(entry) {
      await pool.query(
        "INSERT INTO feedback (id, kind, message, contact, username, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
        [entry.id, entry.kind, entry.message, entry.contact, entry.username, entry.createdAt],
      );
      await pool.query(
        `DELETE FROM feedback WHERE id NOT IN (
          SELECT id FROM feedback ORDER BY created_at DESC LIMIT $1
        )`,
        [MAX_FEEDBACK],
      );
    },

    async listEvents() {
      const res = await pool.query("SELECT * FROM events ORDER BY at DESC");
      return res.rows.map((row) => ({
        id: row.id,
        at: new Date(row.at).toISOString(),
        method: row.method,
        path: row.path,
        status: row.status,
        username: row.username,
      }));
    },

    async recordEvent(entry, limit) {
      await pool.query(
        "INSERT INTO events (id, at, method, path, status, username) VALUES ($1, $2, $3, $4, $5, $6)",
        [entry.id, entry.at, entry.method, entry.path, entry.status, entry.username],
      );
      await pool.query(
        `DELETE FROM events WHERE id NOT IN (
          SELECT id FROM events ORDER BY at DESC LIMIT $1
        )`,
        [limit],
      );
    },

    async countCloudSaves() {
      const res = await pool.query("SELECT COUNT(*)::int AS n FROM saves");
      return res.rows[0].n;
    },

    async estimateDataBytes() {
      const res = await pool.query(`
        SELECT
          COALESCE((SELECT pg_total_relation_size('users')), 0) +
          COALESCE((SELECT pg_total_relation_size('saves')), 0) +
          COALESCE((SELECT pg_total_relation_size('runs')), 0) +
          COALESCE((SELECT pg_total_relation_size('feedback')), 0) +
          COALESCE((SELECT pg_total_relation_size('events')), 0)
          AS bytes
      `);
      return Number(res.rows[0].bytes) || 0;
    },

    /** @internal Exposed for one-shot volume migration. */
    getPool() {
      return pool;
    },
  };
}
