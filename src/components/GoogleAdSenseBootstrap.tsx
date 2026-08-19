import { useEffect } from "react";
import { adsenseConfig, ensureAdSenseScript } from "../ui/adsense";

/**
 * Load AdSense tag early so Google CMP (Privacy & messaging) can attach and
 * pass TCF signals — do not gate on a first-party consent banner.
 */
export const GoogleAdSenseBootstrap = () => {
  useEffect(() => {
    const cfg = adsenseConfig();
    if (!cfg) return;
    void ensureAdSenseScript(cfg.client).catch(() => {
      /* CMP / ads may stay unavailable offline or when blocked */
    });
  }, []);

  return null;
};
