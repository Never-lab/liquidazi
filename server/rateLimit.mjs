/**
 * Tiny in-memory sliding window rate limiter (single Node process).
 * @param {number} [maxEntries=5000]
 */
export function createRateLimiter(maxEntries = 5000) {
  /** @type {Map<string, { count: number, resetAt: number }>} */
  const buckets = new Map();

  /**
   * @param {string} key
   * @param {number} limit
   * @param {number} windowMs
   * @returns {{ ok: boolean, retryAfterSec: number }}
   */
  const check = (key, limit, windowMs) => {
    const now = Date.now();
    let b = buckets.get(key);
    if (!b || now >= b.resetAt) {
      if (buckets.size >= maxEntries) {
        for (const [k, v] of buckets) {
          if (now >= v.resetAt) buckets.delete(k);
        }
        if (buckets.size >= maxEntries) {
          const oldest = buckets.keys().next().value;
          if (oldest != null) buckets.delete(oldest);
        }
      }
      b = { count: 0, resetAt: now + windowMs };
      buckets.set(key, b);
    }
    b.count += 1;
    if (b.count > limit) {
      return {
        ok: false,
        retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)),
      };
    }
    return { ok: true, retryAfterSec: 0 };
  };

  /** @param {string} [prefix] */
  const reset = (prefix) => {
    if (!prefix) {
      buckets.clear();
      return;
    }
    for (const k of buckets.keys()) {
      if (k.startsWith(prefix)) buckets.delete(k);
    }
  };

  return { check, reset, _buckets: buckets };
}

/**
 * Client IP behind Railway / proxies.
 * @param {import("node:http").IncomingMessage} req
 */
export const clientIp = (req) => {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.trim()) {
    return xf.split(",")[0].trim().slice(0, 64);
  }
  if (Array.isArray(xf) && xf[0]) {
    return String(xf[0]).split(",")[0].trim().slice(0, 64);
  }
  return (req.socket?.remoteAddress || "unknown").slice(0, 64);
};
