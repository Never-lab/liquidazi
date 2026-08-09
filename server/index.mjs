/**
 * Floatdesk API entrypoint.
 * Start: node server/index.mjs
 */
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHandler } from "./app.mjs";
import { resolveDataDir } from "./paths.mjs";

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

let dataDir;
let storage;
try {
  ({ dataDir, storage } = resolveDataDir());
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

const adminUsernames = (process.env.LIQUIDAZI_ADMIN_USERNAMES || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const distDir = join(__dir, "..", "dist");
const handler = createHandler({
  dataDir,
  secret: SECRET,
  distDir,
  storage,
  adminUsernames,
});
createServer(handler).listen(PORT, HOST, () => {
  console.log(`Floatdesk listening on http://${HOST}:${PORT}`);
  console.log(`dataDir=${dataDir} storage=${storage}`);
  if (adminUsernames.length) {
    console.log(`adminUsernames=${adminUsernames.length} configured`);
  }
});
