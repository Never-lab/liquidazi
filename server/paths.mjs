import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Resolve persistence backend and optional volume path (file store / migration source).
 *
 * Priority:
 * - DATABASE_URL → Postgres (Railway plugin sets this automatically)
 * - else DATA_DIR → RAILWAY_VOLUME_MOUNT_PATH → local server/data (dev)
 *
 * On Railway without DATABASE_URL, a volume is still required (legacy file mode).
 *
 * @param {{
 *   dataDirEnv?: string | undefined,
 *   volumeMount?: string | undefined,
 *   railwayEnv?: string | undefined,
 *   databaseUrl?: string | undefined,
 *   fallback?: string,
 * }} [opts]
 * @returns {{
 *   dataDir: string,
 *   storage: "volume" | "local" | "postgres",
 *   databaseUrl: string | null,
 * }}
 */
export function resolvePersistence(opts = {}) {
  const databaseUrl = opts.databaseUrl ?? process.env.DATABASE_URL ?? null;
  const dataDirEnv = opts.dataDirEnv ?? process.env.DATA_DIR;
  const volumeMount = opts.volumeMount ?? process.env.RAILWAY_VOLUME_MOUNT_PATH;
  const railwayEnv = opts.railwayEnv ?? process.env.RAILWAY_ENVIRONMENT;
  const fallback =
    opts.fallback ??
    join(dirname(fileURLToPath(import.meta.url)), "data");

  if (databaseUrl) {
    let dataDir = fallback;
    if (dataDirEnv) dataDir = dataDirEnv;
    else if (volumeMount) dataDir = volumeMount;
    return { dataDir, storage: "postgres", databaseUrl };
  }

  if (dataDirEnv) {
    return { dataDir: dataDirEnv, storage: "volume", databaseUrl: null };
  }
  if (volumeMount) {
    return { dataDir: volumeMount, storage: "volume", databaseUrl: null };
  }
  if (railwayEnv) {
    throw new Error(
      "FATAL: Railway persistence missing. Add a Postgres plugin (DATABASE_URL) " +
        "or attach a volume at /data (RAILWAY_VOLUME_MOUNT_PATH). " +
        "Without either, every deploy wipes users/saves.",
    );
  }
  return { dataDir: fallback, storage: "local", databaseUrl: null };
}

/** @deprecated use resolvePersistence */
export function resolveDataDir(opts = {}) {
  const { dataDir, storage, databaseUrl } = resolvePersistence(opts);
  if (databaseUrl) {
    return { dataDir, storage: "volume" };
  }
  return { dataDir, storage };
}
