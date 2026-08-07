import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Resolve where users/runs/saves are stored.
 *
 * On Railway every deploy replaces the container filesystem. Without a volume
 * (or DATA_DIR pointing at one), accounts and saves vanish on each build.
 *
 * Prefer: DATA_DIR → RAILWAY_VOLUME_MOUNT_PATH → local server/data (dev only).
 *
 * @param {{
 *   dataDirEnv?: string | undefined,
 *   volumeMount?: string | undefined,
 *   railwayEnv?: string | undefined,
 *   fallback?: string,
 * }} [opts]
 * @returns {{ dataDir: string, storage: "volume" | "local" }}
 */
export function resolveDataDir(opts = {}) {
  const dataDirEnv = opts.dataDirEnv ?? process.env.DATA_DIR;
  const volumeMount = opts.volumeMount ?? process.env.RAILWAY_VOLUME_MOUNT_PATH;
  const railwayEnv = opts.railwayEnv ?? process.env.RAILWAY_ENVIRONMENT;
  const fallback =
    opts.fallback ??
    join(dirname(fileURLToPath(import.meta.url)), "data");

  if (dataDirEnv) {
    return { dataDir: dataDirEnv, storage: "volume" };
  }
  if (volumeMount) {
    return { dataDir: volumeMount, storage: "volume" };
  }
  if (railwayEnv) {
    throw new Error(
      "FATAL: Railway volume missing. Attach a volume with mount path /data " +
        "(Service → Settings → Volumes). Railway sets RAILWAY_VOLUME_MOUNT_PATH; " +
        "or set DATA_DIR to that mount path. Without it every deploy wipes users/saves.",
    );
  }
  return { dataDir: fallback, storage: "local" };
}
