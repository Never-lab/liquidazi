import type { AuthSession } from "../api/client";

export const PERSIST_KEY = "liquidazi-save";

/** Read auth from Zustand persist blob (shared with the game app). */
export const readPersistedAuth = (
  raw: string | null = typeof localStorage !== "undefined"
    ? localStorage.getItem(PERSIST_KEY)
    : null,
): AuthSession | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as {
      state?: { auth?: AuthSession | null };
    };
    const auth = parsed.state?.auth;
    if (!auth?.token || !auth.username) return null;
    return {
      token: auth.token,
      username: auth.username,
      admin: Boolean(auth.admin),
    };
  } catch {
    return null;
  }
};
