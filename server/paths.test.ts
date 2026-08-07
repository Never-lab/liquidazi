import { describe, expect, it } from "vitest";
import { resolveDataDir } from "./paths.mjs";

describe("resolveDataDir", () => {
  it("prefers DATA_DIR over volume mount", () => {
    expect(
      resolveDataDir({
        dataDirEnv: "/custom",
        volumeMount: "/data",
        railwayEnv: "production",
        fallback: "/fallback",
      }),
    ).toEqual({ dataDir: "/custom", storage: "volume" });
  });

  it("uses RAILWAY_VOLUME_MOUNT_PATH when DATA_DIR unset", () => {
    expect(
      resolveDataDir({
        dataDirEnv: undefined,
        volumeMount: "/data",
        railwayEnv: "production",
        fallback: "/fallback",
      }),
    ).toEqual({ dataDir: "/data", storage: "volume" });
  });

  it("throws on Railway when neither DATA_DIR nor volume is set", () => {
    expect(() =>
      resolveDataDir({
        dataDirEnv: undefined,
        volumeMount: undefined,
        railwayEnv: "production",
        fallback: "/fallback",
      }),
    ).toThrow(/volume missing/i);
  });

  it("falls back to local server/data off Railway", () => {
    expect(
      resolveDataDir({
        dataDirEnv: undefined,
        volumeMount: undefined,
        railwayEnv: undefined,
        fallback: "/tmp/local-data",
      }),
    ).toEqual({ dataDir: "/tmp/local-data", storage: "local" });
  });
});
