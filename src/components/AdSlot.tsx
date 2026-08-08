import { adsStubEnabled, type AdPlacement } from "../ui/adsStub";
import styles from "./AdSlot.module.css";

type Props = { placement: AdPlacement };

const sizeClass: Record<AdPlacement, string> = {
  "rail-left": styles.rail,
  "rail-right": styles.rail,
  "end-banner": styles.banner,
};

export const AdSlot = ({ placement }: Props) => {
  if (!adsStubEnabled()) return null;

  const sponsor = import.meta.env.VITE_ADS_SPONSOR_URL as string | undefined;
  const href = typeof sponsor === "string" && sponsor.trim() ? sponsor.trim() : null;

  return (
    <aside
      className={`${styles.slot} ${sizeClass[placement]}`}
      data-placement={placement}
      aria-label="Spazio advertiser"
    >
      <p className={styles.label}>Spazio advertiser</p>
      {href ? (
        <a className={styles.link} href={href} target="_blank" rel="noopener noreferrer">
          Diventa sponsor
        </a>
      ) : null}
    </aside>
  );
};
