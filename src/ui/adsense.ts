import type { AdPlacement } from "./adsStub";

/** Public publisher id — overridable via VITE_ADSENSE_CLIENT. */
export const DEFAULT_ADSENSE_CLIENT = "ca-pub-9163410629777799";
/** AppLiquidazi AdSense unit id — overridable via VITE_ADSENSE_SLOT. */
export const DEFAULT_ADSENSE_SLOT = "4293531391";

type AdSenseEnv = {
  VITE_ADSENSE_CLIENT?: string;
  VITE_ADSENSE_SLOT?: string;
};

export type AdSenseConfig = {
  client: string;
  slot: string;
};

export const adsenseConfig = (env?: AdSenseEnv): AdSenseConfig | null => {
  const e = env ?? {
    VITE_ADSENSE_CLIENT: import.meta.env.VITE_ADSENSE_CLIENT as string | undefined,
    VITE_ADSENSE_SLOT: import.meta.env.VITE_ADSENSE_SLOT as string | undefined,
  };
  const client = (e.VITE_ADSENSE_CLIENT?.trim() || DEFAULT_ADSENSE_CLIENT).trim();
  const slot = (e.VITE_ADSENSE_SLOT?.trim() || DEFAULT_ADSENSE_SLOT).trim();
  if (!client.startsWith("ca-pub-") || !/^\d+$/.test(slot)) return null;
  return { client, slot };
};

/** Full-width responsive expands on mobile — keep off for narrow rails. */
export const adsenseFullWidth = (placement: AdPlacement): boolean =>
  placement === "landing-mid" ||
  placement === "landing-footer" ||
  placement === "end-banner";

const ADSENSE_SCRIPT_URL = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";

export const ensureAdSenseScript = (client: string): Promise<void> => {
  if (typeof document === "undefined") return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>(
    `script[src^="${ADSENSE_SCRIPT_URL}"]`,
  );
  if (existing) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.async = true;
    s.src = `${ADSENSE_SCRIPT_URL}?client=${encodeURIComponent(client)}`;
    s.crossOrigin = "anonymous";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("AdSense script failed to load"));
    document.head.appendChild(s);
  });
};

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

export const pushAdSense = (): void => {
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch {
    /* AdSense may throw if already filled */
  }
};
