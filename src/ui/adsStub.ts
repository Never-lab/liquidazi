export type AdPlacement = "rail-left" | "rail-right" | "end-banner";

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
