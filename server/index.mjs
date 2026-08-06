/**
 * Liquidazi API entrypoint.
 * Start: node server/index.mjs
 */
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHandler } from "./app.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dir, "data");
const PORT = Number(process.env.PORT || 8787);
const DEV_SECRET = "liquidazi-dev-secret-change-me";
const SECRET = process.env.LIQUIDAZI_SECRET || DEV_SECRET;
const isProd =
  Boolean(process.env.RAILWAY_ENVIRONMENT) || process.env.NODE_ENV === "production";

if (isProd && (!process.env.LIQUIDAZI_SECRET || SECRET === DEV_SECRET)) {
  console.error("LIQUIDAZI_SECRET must be set to a non-default value in production");
  process.exit(1);
}

const distDir = join(__dir, "..", "dist");
const handler = createHandler({ dataDir: DATA, secret: SECRET, distDir });
createServer(handler).listen(PORT, () => {
  console.log(`Liquidazi on http://127.0.0.1:${PORT}`);
});
