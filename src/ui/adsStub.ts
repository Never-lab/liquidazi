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

/**
 * Landing slots reserve layout for future ads — show in all builds unless
 * explicitly forced off (`VITE_ADS_STUB=0`). In-game rails/end-banner keep prod default.
 */
export const shouldRenderAdSlot = (placement: AdPlacement, env?: AdsEnv): boolean => {
  if (placement === "landing-mid" || placement === "landing-footer") {
    const e = env ?? {
      VITE_ADS_STUB: import.meta.env.VITE_ADS_STUB as string | undefined,
    };
    return e.VITE_ADS_STUB !== "0";
  }
  return adsStubEnabled(env);
};
