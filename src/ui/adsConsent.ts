export type AdsConsent = "accepted" | "rejected";

export const ADS_CONSENT_KEY = "liquidazi-ads-consent";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

const listeners = new Set<() => void>();

let cached: AdsConsent | null | undefined;

const storageOrUndef = (): StorageLike | undefined => {
  try {
    if (typeof localStorage === "undefined") return undefined;
    return localStorage;
  } catch {
    return undefined;
  }
};

export const readAdsConsent = (storage?: StorageLike): AdsConsent | null => {
  const s = storage ?? storageOrUndef();
  if (!s) return null;
  try {
    const v = s.getItem(ADS_CONSENT_KEY);
    if (v === "accepted" || v === "rejected") return v;
  } catch {
    /* private mode */
  }
  return null;
};

export const writeAdsConsent = (
  value: AdsConsent,
  storage?: StorageLike,
): void => {
  const s = storage ?? storageOrUndef();
  if (s) {
    try {
      s.setItem(ADS_CONSENT_KEY, value);
    } catch {
      /* ignore */
    }
  }
  cached = value;
  listeners.forEach((l) => l());
};

/** Snapshot for useSyncExternalStore (browser). */
export const getAdsConsentSnapshot = (): AdsConsent | null => {
  if (cached !== undefined) return cached;
  cached = readAdsConsent();
  return cached;
};

export const subscribeAdsConsent = (onChange: () => void): (() => void) => {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
};

/** Test helper: clear in-memory cache between cases. */
export const resetAdsConsentCache = (): void => {
  cached = undefined;
};
