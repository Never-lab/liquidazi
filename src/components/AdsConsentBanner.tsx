import { useSyncExternalStore } from "react";
import {
  COOKIE_BANNER,
  getAdsConsentSnapshot,
  subscribeAdsConsent,
  writeAdsConsent,
} from "../ui/adsConsent";
import { adsenseConfig } from "../ui/adsense";
import styles from "./AdsConsentBanner.module.css";

/** First-party CMP: ads cookies only; necessary storage does not need a choice. */
export const AdsConsentBanner = () => {
  const consent = useSyncExternalStore(
    subscribeAdsConsent,
    getAdsConsentSnapshot,
    () => null,
  );

  if (!adsenseConfig() || consent !== null) return null;

  return (
    <div className={styles.banner} role="dialog" aria-labelledby="ads-consent-title">
      <div className={styles.inner}>
        <p id="ads-consent-title" className={styles.title}>
          {COOKIE_BANNER.title}
        </p>
        <p className={styles.text}>
          {COOKIE_BANNER.text}{" "}
          <a className={styles.privacy} href={COOKIE_BANNER.privacyHref}>
            {COOKIE_BANNER.privacyLabel}
          </a>
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.reject}
            onClick={() => writeAdsConsent("rejected")}
          >
            {COOKIE_BANNER.reject}
          </button>
          <button
            type="button"
            className={styles.accept}
            onClick={() => writeAdsConsent("accepted")}
          >
            {COOKIE_BANNER.accept}
          </button>
        </div>
      </div>
    </div>
  );
};
