const KEY = "liquidazi-pulse-id";

export const getPulseSessionId = (): string => {
  try {
    const existing = localStorage.getItem(KEY);
    if (existing && /^[a-zA-Z0-9_-]{8,64}$/.test(existing)) return existing;
    const id = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
    localStorage.setItem(KEY, id);
    return id;
  } catch {
    return `anon${Date.now().toString(36)}`;
  }
};
