/**
 * One-shot import from JSON volume (/data) into Postgres.
 * Usage: DATA_DIR=/data DATABASE_URL=postgres://... npm run db:migrate-from-volume
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createPgStore } from "../server/pgStore.mjs";
import { UPSERT_RUN_SQL, runToColumns } from "../server/pgSchema.mjs";
import { resolvePersistence } from "../server/paths.mjs";

const loadJson = (path, fallback) => {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8"));
};

const { dataDir, databaseUrl } = resolvePersistence();
if (!databaseUrl) {
  console.error("FATAL: set DATABASE_URL for migration target.");
  process.exit(1);
}

const store = createPgStore(databaseUrl);
await store.ready();

const pool = store.getPool();
const client = await pool.connect();

try {
  await client.query("BEGIN");

  const users = loadJson(join(dataDir, "users.json"), []);
  for (const user of users) {
    await client.query(
      `INSERT INTO users (id, username, hash, salt, achievements)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         username = EXCLUDED.username,
         hash = EXCLUDED.hash,
         salt = EXCLUDED.salt,
         achievements = EXCLUDED.achievements`,
      [
        user.id,
        user.username,
        user.hash,
        user.salt,
        JSON.stringify(user.achievements ?? []),
      ],
    );
  }

  const savesDir = join(dataDir, "saves");
  if (existsSync(savesDir)) {
    for (const name of readdirSync(savesDir)) {
      if (!name.endsWith(".json")) continue;
      const userId = name.replace(/\.json$/, "");
      const payload = loadJson(join(savesDir, name), null);
      if (!payload) continue;
      await client.query(
        `INSERT INTO saves (user_id, payload, updated_at)
         VALUES ($1, $2, now())
         ON CONFLICT (user_id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()`,
        [userId, payload],
      );
    }
  }

  const runs = loadJson(join(dataDir, "runs.json"), []);
  for (const run of runs) {
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
  }

  const feedback = loadJson(join(dataDir, "feedback.json"), []);
  for (const entry of feedback) {
    await client.query(
      `INSERT INTO feedback (id, kind, message, contact, username, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [entry.id, entry.kind, entry.message, entry.contact, entry.username, entry.createdAt],
    );
  }

  const events = loadJson(join(dataDir, "events.json"), []);
  for (const entry of events) {
    await client.query(
      `INSERT INTO events (id, at, method, path, status, username)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [entry.id, entry.at, entry.method, entry.path, entry.status, entry.username],
    );
  }

  await client.query("COMMIT");
  console.info(
    `[migrate] imported from ${dataDir}: users=${users.length} runs=${runs.length} saves dir=${existsSync(savesDir) ? "yes" : "no"}`,
  );
} catch (err) {
  await client.query("ROLLBACK");
  console.error(err);
  process.exit(1);
} finally {
  client.release();
  await store.close();
}
