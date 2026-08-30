type LmEnv = { VITE_LOCALMANAGER_URL?: string };

/** Default early-access LocalManager build — override with VITE_LOCALMANAGER_URL. */
export const DEFAULT_LOCALMANAGER_URL =
  "https://web-api-prod-production-511b.up.railway.app/";

/** Public LocalManager build URL — invalid → null (card stays disabled). */
export const localManagerUrl = (env?: LmEnv): string | null => {
  const e = env ?? {
    VITE_LOCALMANAGER_URL: import.meta.env.VITE_LOCALMANAGER_URL as string | undefined,
  };
  const raw = (e.VITE_LOCALMANAGER_URL?.trim() || DEFAULT_LOCALMANAGER_URL).trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.href;
  } catch {
    return null;
  }
};
