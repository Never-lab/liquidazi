import { useEffect } from "react";
import { adsenseConfig, ensureAdSenseScript } from "../ui/adsense";
import { ADSENSE_ALLOWED_PLACEMENTS } from "../ui/adsStub";

/**
 * Load AdSense tag early so Google CMP (Privacy & messaging) can attach.
 * Skip while no placements are allowlisted (Phase 0 — avoid Auto ads on thin/UI screens).
 */
export const GoogleAdSenseBootstrap = () => {
  useEffect(() => {
    if (ADSENSE_ALLOWED_PLACEMENTS.length === 0) return;
    const cfg = adsenseConfig();
    if (!cfg) return;
    void ensureAdSenseScript(cfg.client).catch(() => {
      /* CMP / ads may stay unavailable offline or when blocked */
    });
  }, []);

  return null;
};
