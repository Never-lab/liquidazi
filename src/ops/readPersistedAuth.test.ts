import { describe, expect, it } from "vitest";
import { readPersistedAuth } from "./readPersistedAuth";

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
});
