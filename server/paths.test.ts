import { describe, expect, it } from "vitest";
import { resolveDataDir, resolvePersistence } from "./paths.mjs";

describe("resolvePersistence", () => {
  it("prefers Postgres when DATABASE_URL is set", () => {
    expect(
      resolvePersistence({
        databaseUrl: "postgres://u:p@host/db",
        dataDirEnv: "/custom",
        volumeMount: "/data",
        railwayEnv: "production",
        fallback: "/fallback",
      }),
    ).toEqual({
      dataDir: "/custom",
      storage: "postgres",
      databaseUrl: "postgres://u:p@host/db",
    });
  });

  it("prefers DATA_DIR over volume mount for file mode", () => {
    expect(
      resolvePersistence({
        dataDirEnv: "/custom",
        volumeMount: "/data",
        railwayEnv: "production",
        fallback: "/fallback",
      }),
    ).toEqual({ dataDir: "/custom", storage: "volume", databaseUrl: null });
  });

  it("uses RAILWAY_VOLUME_MOUNT_PATH when DATA_DIR unset", () => {
    expect(
      resolvePersistence({
        dataDirEnv: undefined,
        volumeMount: "/data",
        railwayEnv: "production",
        fallback: "/fallback",
      }),
    ).toEqual({ dataDir: "/data", storage: "volume", databaseUrl: null });
  });

  it("throws on Railway when neither DATABASE_URL nor volume is set", () => {
    expect(() =>
      resolvePersistence({
        dataDirEnv: undefined,
        volumeMount: undefined,
        railwayEnv: "production",
        fallback: "/fallback",
      }),
    ).toThrow(/persistence missing/i);
  });

  it("falls back to local server/data off Railway", () => {
    expect(
      resolvePersistence({
        dataDirEnv: undefined,
        volumeMount: undefined,
        railwayEnv: undefined,
        fallback: "/tmp/local-data",
      }),
    ).toEqual({ dataDir: "/tmp/local-data", storage: "local", databaseUrl: null });
  });
});

describe("resolveDataDir (legacy)", () => {
  it("maps postgres mode to volume path for backward compat", () => {
    expect(
      resolveDataDir({
        databaseUrl: "postgres://u:p@host/db",
        volumeMount: "/data",
        railwayEnv: "production",
        fallback: "/fallback",
      }),
    ).toEqual({ dataDir: "/data", storage: "volume" });
  });
});
