import type { AuthSession } from "../api/client";

export const PERSIST_KEY = "liquidazi-save";

type TokenStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

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

export const writePersistedAuthToken = (
  token: string,
  storage: TokenStorage = localStorage,
): void => {
  try {
    const raw = storage.getItem(PERSIST_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as {
      state?: { auth?: AuthSession | null };
    };
    if (!parsed.state?.auth?.token) return;
    parsed.state.auth = { ...parsed.state.auth, token };
    storage.setItem(PERSIST_KEY, JSON.stringify(parsed));
  } catch {
    /* ignore */
  }
};
