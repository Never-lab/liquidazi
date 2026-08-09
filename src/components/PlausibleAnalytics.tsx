import { useEffect } from "react";
import { plausibleConfig } from "../ui/plausible";

const SCRIPT_ATTR = "data-liquidazi-plausible";

/** Inject Plausible when VITE_PLAUSIBLE_DOMAIN is set (no cookies). */
export const PlausibleAnalytics = () => {
  useEffect(() => {
    const cfg = plausibleConfig();
    if (!cfg || typeof document === "undefined") return;
    if (document.querySelector(`script[${SCRIPT_ATTR}]`)) return;
    const s = document.createElement("script");
    s.defer = true;
    s.src = cfg.scriptSrc;
    s.setAttribute("data-domain", cfg.domain);
    s.setAttribute(SCRIPT_ATTR, "1");
    document.head.appendChild(s);
  }, []);

  return null;
};
