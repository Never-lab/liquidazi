import { describe, expect, it } from "vitest";
import { clientIp, createRateLimiter } from "./rateLimit.mjs";

describe("createRateLimiter", () => {
  it("allows up to limit then blocks within window", () => {
    const rl = createRateLimiter();
    expect(rl.check("a", 2, 60_000).ok).toBe(true);
    expect(rl.check("a", 2, 60_000).ok).toBe(true);
    const blocked = rl.check("a", 2, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("isolates keys", () => {
    const rl = createRateLimiter();
    expect(rl.check("x", 1, 60_000).ok).toBe(true);
    expect(rl.check("y", 1, 60_000).ok).toBe(true);
    expect(rl.check("x", 1, 60_000).ok).toBe(false);
  });
});

describe("clientIp", () => {
  it("prefers first x-forwarded-for hop", () => {
    expect(
      clientIp({
        headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.1" },
        socket: { remoteAddress: "127.0.0.1" },
      }),
    ).toBe("1.2.3.4");
  });
});
