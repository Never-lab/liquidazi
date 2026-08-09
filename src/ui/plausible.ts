/** Plausible (or compatible) — cookieless; load only when domain configured. */

export type PlausibleConfig = {
  domain: string;
  scriptSrc: string;
};

type Env = {
  VITE_PLAUSIBLE_DOMAIN?: string;
  VITE_PLAUSIBLE_SRC?: string;
};

export const plausibleConfig = (env?: Env): PlausibleConfig | null => {
  const e = env ?? {
    VITE_PLAUSIBLE_DOMAIN: import.meta.env.VITE_PLAUSIBLE_DOMAIN as
      | string
      | undefined,
    VITE_PLAUSIBLE_SRC: import.meta.env.VITE_PLAUSIBLE_SRC as string | undefined,
  };
  const domain = e.VITE_PLAUSIBLE_DOMAIN?.trim();
  if (!domain) return null;
  const scriptSrc =
    e.VITE_PLAUSIBLE_SRC?.trim() || "https://plausible.io/js/script.js";
  return { domain, scriptSrc };
};

export type OpsTrafficLinks = {
  gscUrl: string | null;
  plausibleDashboardUrl: string | null;
};

export const opsTrafficLinks = (env?: {
  VITE_GSC_URL?: string;
  VITE_PLAUSIBLE_DASHBOARD_URL?: string;
}): OpsTrafficLinks => {
  const e = env ?? {
    VITE_GSC_URL: import.meta.env.VITE_GSC_URL as string | undefined,
    VITE_PLAUSIBLE_DASHBOARD_URL: import.meta.env
      .VITE_PLAUSIBLE_DASHBOARD_URL as string | undefined,
  };
  const trimOrNull = (v?: string) => {
    const t = v?.trim();
    return t ? t : null;
  };
  return {
    gscUrl: trimOrNull(e.VITE_GSC_URL),
    plausibleDashboardUrl: trimOrNull(e.VITE_PLAUSIBLE_DASHBOARD_URL),
  };
};
