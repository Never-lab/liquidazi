import { afterEach, describe, expect, it } from "vitest";
import {
  ACTIVITY_KEY,
  SESSION_EXPIRED_TOAST,
  SESSION_IDLE_MS,
  clearActivity,
  isIdleExpired,
  recordActivity,
} from "./sessionIdle";

afterEach(() => {
  localStorage.removeItem(ACTIVITY_KEY);
});

describe("sessionIdle", () => {
  it("idle window is 2h", () => {
    expect(SESSION_IDLE_MS).toBe(2 * 60 * 60 * 1000);
    expect(SESSION_EXPIRED_TOAST).toBe("Sessione scaduta");
  });

  it("fresh activity is not expired; 2h later is", () => {
    const now = 1_700_000_000_000;
    recordActivity(now);
    expect(isIdleExpired(now)).toBe(false);
    expect(isIdleExpired(now + SESSION_IDLE_MS)).toBe(false);
    expect(isIdleExpired(now + SESSION_IDLE_MS + 1)).toBe(true);
  });

  it("missing activity is expired; clear removes it", () => {
    expect(isIdleExpired()).toBe(true);
    recordActivity(1_700_000_000_000);
    clearActivity();
    expect(localStorage.getItem(ACTIVITY_KEY)).toBe(null);
    expect(isIdleExpired(1_700_000_000_000)).toBe(true);
  });
});
