/**
 * Floatdesk API entrypoint.
 * Start: node server/index.mjs
 */
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHandler } from "./app.mjs";
import { resolvePersistence } from "./paths.mjs";
import { createStore } from "./store.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "0.0.0.0";
const DEV_SECRET = "liquidazi-dev-secret-change-me";
const SECRET = process.env.LIQUIDAZI_SECRET || DEV_SECRET;
const isProd =
  Boolean(process.env.RAILWAY_ENVIRONMENT) || process.env.NODE_ENV === "production";

if (isProd && (!process.env.LIQUIDAZI_SECRET || SECRET === DEV_SECRET)) {
  console.error(
    "FATAL: set LIQUIDAZI_SECRET in Railway Variables to a long random string (not the dev default).",
  );
  process.exit(1);
}

let persistence;
try {
  persistence = resolvePersistence();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

const { dataDir, storage, databaseUrl } = persistence;

const adminUsernames = (process.env.LIQUIDAZI_ADMIN_USERNAMES || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const distDir = join(__dir, "..", "dist");

const store = await createStore({ dataDir, databaseUrl, storage });
await store.ready();

const handler = createHandler({
  store,
  secret: SECRET,
  distDir,
  adminUsernames,
});

const server = createServer(handler);
server.listen(PORT, HOST, () => {
  console.log(`Floatdesk listening on http://${HOST}:${PORT}`);
  console.log(`storage=${store.storage}${databaseUrl ? " (DATABASE_URL)" : ` dataDir=${dataDir}`}`);
  if (adminUsernames.length) {
    console.log(`adminUsernames=${adminUsernames.length} configured`);
  }
});

const shutdown = async () => {
  server.close();
  await store.close();
  process.exit(0);
};

process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
