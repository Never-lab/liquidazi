export const DEFAULT_EVENT_LOG_LIMIT = 2000;
export const RECENT_EVENT_LIMIT = 40;

const STATIC_EXT = /\.(?:js|css|map|woff2|ico|png|svg)$/i;

export const requestPath = (urlPath) => (urlPath || "/").split("?")[0] || "/";

export const shouldSkipEvent = (method, path) => {
  if (method === "OPTIONS") return true;
  const p = requestPath(path);
  if (p.startsWith("/assets/")) return true;
  if (STATIC_EXT.test(p)) return true;
  const trimmed = p.replace(/\/+$/, "") || "/";
  if (method === "GET" && trimmed === "/api/admin/stats") return true;
  return false;
};

export const appendEvent = (events, entry, limit = DEFAULT_EVENT_LOG_LIMIT) => {
  const next = [...events, entry];
  return next.length > limit ? next.slice(-limit) : next;
};

export const summarizeEvents = (events, now = Date.now()) => {
  const dayMs = 86_400_000;
  const in24 = events.filter((e) => now - Date.parse(e.at) < dayMs);
  const in7 = events.filter((e) => now - Date.parse(e.at) < 7 * dayMs);
  return {
    events24h: in24.length,
    events7d: in7.length,
    notFound24h: in24.filter((e) => e.status === 404).length,
    recentEvents: events.slice(-RECENT_EVENT_LIMIT).reverse(),
  };
};
