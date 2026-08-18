import { describe, expect, it } from "vitest";
import { PERSIST_KEY, readPersistedAuth, writePersistedAuthToken } from "./readPersistedAuth";

describe("readPersistedAuth", () => {
  it("returns null on empty", () => {
    expect(readPersistedAuth(null)).toBe(null);
    expect(readPersistedAuth("")).toBe(null);
  });

  it("reads zustand persist shape", () => {
    const raw = JSON.stringify({
      state: {
        auth: { token: "t", username: "nick", admin: true },
      },
      version: 10,
    });
    expect(readPersistedAuth(raw)).toEqual({
      token: "t",
      username: "nick",
      admin: true,
    });
  });

  it("rejects incomplete auth", () => {
    expect(
      readPersistedAuth(
        JSON.stringify({ state: { auth: { token: "t" } } }),
      ),
    ).toBe(null);
  });

  it("patches token in zustand persist blob", () => {
    const storage = new Map<string, string>();
    storage.set(
      PERSIST_KEY,
      JSON.stringify({
        state: { auth: { token: "old", username: "nick", admin: true } },
        version: 10,
      }),
    );
    writePersistedAuthToken("new", {
      getItem: (k) => storage.get(k) ?? null,
      setItem: (k, v) => {
        storage.set(k, v);
      },
    });
    expect(readPersistedAuth(storage.get(PERSIST_KEY) ?? null)?.token).toBe("new");
  });
});
