import { describe, expect, it } from "vitest";
import {
  SESSION_ABS_MS,
  SESSION_IDLE_MS,
  makeSessionToken,
  readSessionToken,
  refreshSessionToken,
} from "./sessionToken.mjs";

const SECRET = "test-secret";
const UID = "aabbccddeeff0011";

describe("sessionToken", () => {
  it("idle window is 2h and absolute cap is 7d", () => {
    expect(SESSION_IDLE_MS).toBe(2 * 60 * 60 * 1000);
    expect(SESSION_ABS_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("rejects 3-part legacy tokens", () => {
    const now = 1_700_000_000_000;
    const legacy = makeSessionToken(UID, SECRET, now).split(".").slice(0, 3).join(".");
    expect(readSessionToken(legacy, SECRET, now)).toBeNull();
  });

  it("accepts a fresh token and rejects after idle", () => {
    const now = 1_700_000_000_000;
    const token = makeSessionToken(UID, SECRET, now);
    expect(readSessionToken(token, SECRET, now)?.userId).toBe(UID);
    expect(readSessionToken(token, SECRET, now + SESSION_IDLE_MS + 1)).toBeNull();
  });

  it("rejects after absolute 7d even if idle was refreshed in the past", () => {
    const now = 1_700_000_000_000;
    const token = makeSessionToken(UID, SECRET, now);
    const late = now + SESSION_ABS_MS + 1;
    expect(readSessionToken(token, SECRET, late)).toBeNull();
  });

  it("refresh extends idle but never past abs", () => {
    const now = 1_700_000_000_000;
    const token = makeSessionToken(UID, SECRET, now);
    const session = readSessionToken(token, SECRET, now);
    const t1h = refreshSessionToken(session, SECRET, now + 60 * 60 * 1000);
    expect(t1h).toBeTruthy();
    const next = readSessionToken(t1h, SECRET, now + 60 * 60 * 1000);
    expect(next?.abs).toBe(session.abs);
    expect(next?.exp).toBe(Math.min(session.abs, now + 60 * 60 * 1000 + SESSION_IDLE_MS));
  });
});
