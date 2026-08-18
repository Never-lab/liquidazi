import { describe, expect, it } from "vitest";
import {
  DEFAULT_EVENT_LOG_LIMIT,
  appendEvent,
  requestPath,
  shouldSkipEvent,
  summarizeEvents,
} from "./eventLog.mjs";

describe("eventLog", () => {
  it("strips querystring from the logged path", () => {
    expect(requestPath("/api/health?x=1")).toBe("/api/health");
  });

  it("skips OPTIONS, hashed assets, static files, and GET admin stats", () => {
    expect(shouldSkipEvent("OPTIONS", "/api/health")).toBe(true);
    expect(shouldSkipEvent("GET", "/assets/main-abc.js")).toBe(true);
    expect(shouldSkipEvent("GET", "/favicon.ico")).toBe(true);
    expect(shouldSkipEvent("GET", "/api/admin/stats")).toBe(true);
    expect(shouldSkipEvent("GET", "/api/health")).toBe(false);
    expect(shouldSkipEvent("GET", "/saves")).toBe(false);
    expect(shouldSkipEvent("POST", "/api/auth/register")).toBe(false);
  });

  it("drops oldest events past the limit", () => {
    expect(DEFAULT_EVENT_LOG_LIMIT).toBe(2000);
    const kept = appendEvent(
      [
        { id: "a", at: "2026-01-01T00:00:00.000Z", method: "GET", path: "/a", status: 200, username: null },
        { id: "b", at: "2026-01-01T00:00:01.000Z", method: "GET", path: "/b", status: 200, username: null },
      ],
      { id: "c", at: "2026-01-01T00:00:02.000Z", method: "GET", path: "/c", status: 200, username: null },
      2,
    );
    expect(kept.map((e) => e.id)).toEqual(["b", "c"]);
  });

  it("counts 24h / 7d / 404 and returns newest first", () => {
    const now = Date.parse("2026-08-18T12:00:00.000Z");
    const events = [
      { id: "old", at: "2026-08-01T12:00:00.000Z", method: "GET", path: "/", status: 200, username: null },
      { id: "w", at: "2026-08-16T12:00:00.000Z", method: "GET", path: "/privacy", status: 200, username: null },
      { id: "n", at: "2026-08-18T11:00:00.000Z", method: "GET", path: "/nope", status: 404, username: null },
    ];
    const s = summarizeEvents(events, now);
    expect(s.events24h).toBe(1);
    expect(s.events7d).toBe(2);
    expect(s.notFound24h).toBe(1);
    expect(s.recentEvents.map((e) => e.id)).toEqual(["n", "w", "old"]);
  });
});
