import { useSyncExternalStore } from "react";
import {
  getAdsConsentSnapshot,
  subscribeAdsConsent,
  writeAdsConsent,
} from "../ui/adsConsent";
import { adsenseConfig } from "../ui/adsense";
import styles from "./AdsConsentBanner.module.css";

/** Minimal first-party CMP: show until user accepts or rejects ads cookies. */
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
          Cookie pubblicitari
        </p>
        <p className={styles.text}>
          Usiamo Google AdSense negli spazi advertiser per coprire i costi di hosting.
          Nessun annuncio sul tabellone di gioco. Puoi rifiutare: vedrai solo i
          segnaposto.
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.reject}
            onClick={() => writeAdsConsent("rejected")}
          >
            Rifiuta
          </button>
          <button
            type="button"
            className={styles.accept}
            onClick={() => writeAdsConsent("accepted")}
          >
            Accetta
          </button>
        </div>
      </div>
    </div>
  );
};
