import { useEffect, useRef } from "react";
import {
  adsenseConfig,
  adsenseFullWidth,
  ensureAdSenseScript,
  pushAdSense,
} from "../ui/adsense";
import { shouldRenderAdSlot, type AdPlacement } from "../ui/adsStub";
import styles from "./AdSlot.module.css";

type Props = { placement: AdPlacement };

const sizeClass: Record<AdPlacement, string> = {
  "rail-left": styles.rail,
  "rail-right": styles.rail,
  "end-banner": styles.banner,
  "landing-mid": styles.landing,
  "landing-footer": styles.landing,
};

const StubBody = () => {
  const sponsor = import.meta.env.VITE_ADS_SPONSOR_URL as string | undefined;
  const href = typeof sponsor === "string" && sponsor.trim() ? sponsor.trim() : null;
  return (
    <>
      <p className={styles.label}>Spazio advertiser</p>
      {href ? (
        <a className={styles.link} href={href} target="_blank" rel="noopener noreferrer">
          Diventa sponsor
        </a>
      ) : null}
    </>
  );
};

export const AdSlot = ({ placement }: Props) => {
  const visible = shouldRenderAdSlot(placement);
  const config = adsenseConfig();
  const client = config?.client;
  const slot = config?.slot;
  const live = Boolean(visible && client && slot);
  const insRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (!live || !client || !slot || !insRef.current || pushed.current) return;
    let cancelled = false;
    void ensureAdSenseScript(client)
      .then(() => {
        if (cancelled || pushed.current) return;
        pushed.current = true;
        pushAdSense();
      })
      .catch(() => {
        /* leave empty ins if script fails */
      });
    return () => {
      cancelled = true;
    };
  }, [live, client, slot]);

  if (!visible) return null;

  return (
    <aside
      className={`${styles.slot} ${sizeClass[placement]} ${live ? styles.live : ""}`}
      data-placement={placement}
      aria-label="Spazio advertiser"
    >
      {live && client && slot ? (
        <ins
          ref={insRef}
          className={`adsbygoogle ${styles.ins}`}
          style={{ display: "block" }}
          data-ad-client={client}
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive={adsenseFullWidth(placement) ? "true" : "false"}
        />
      ) : (
        <StubBody />
      )}
    </aside>
  );
};
