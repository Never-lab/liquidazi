import { createFileStore } from "./fileStore.mjs";
import { createPgStore } from "./pgStore.mjs";

/**
 * @param {{
 *   dataDir: string,
 *   databaseUrl?: string | null,
 *   storage?: import("./storeShared.mjs").StorageMode,
 * }} opts
 */
export async function createStore({ dataDir, databaseUrl, storage }) {
  if (databaseUrl) {
    return createPgStore(databaseUrl);
  }
  return createFileStore(dataDir, storage === "volume" ? "volume" : "local");
}

export { createFileStore } from "./fileStore.mjs";
export { createPgStore } from "./pgStore.mjs";
