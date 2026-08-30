export type AdPlacement =
  | "rail-left"
  | "rail-right"
  | "end-banner"
  | "landing-mid"
  | "landing-footer";

type AdsEnv = {
  PROD?: boolean;
  VITE_ADS_STUB?: string;
};

/**
 * AdSense only next to publisher content (wiki). Empty until `/wiki` slots ship —
 * landing / game chrome / end screen must not serve Google ads (AdSense policy).
 */
export const ADSENSE_ALLOWED_PLACEMENTS: readonly AdPlacement[] = [];

/** Kill switch: explicit VITE_ADS_STUB wins; else on only in production builds. */
export const adsStubEnabled = (env?: AdsEnv): boolean => {
  const e = env ?? {
    PROD: import.meta.env.PROD,
    VITE_ADS_STUB: import.meta.env.VITE_ADS_STUB as string | undefined,
  };
  if (e.VITE_ADS_STUB === "0") return false;
  if (e.VITE_ADS_STUB === "1") return true;
  return Boolean(e.PROD);
};

/** Renders an ad unit only if the placement is allowlisted and the stub/live switch is on. */
export const shouldRenderAdSlot = (placement: AdPlacement, env?: AdsEnv): boolean => {
  if (!ADSENSE_ALLOWED_PLACEMENTS.includes(placement)) return false;
  return adsStubEnabled(env);
};
