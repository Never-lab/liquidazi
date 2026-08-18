import { useEffect } from "react";
import { LEGAL_PAGES } from "../content/legal";
import type { LegalPageId } from "../ui/legalPath";
import styles from "./MenuScreen.module.css";
import legalStyles from "./LegalScreen.module.css";

type Props = { page: LegalPageId };

export const LegalScreen = ({ page }: Props) => {
  const doc = LEGAL_PAGES[page];

  useEffect(() => {
    const prev = document.title;
    document.title = doc.documentTitle;
    return () => {
      document.title = prev;
    };
  }, [doc]);

  return (
    <div className={styles.menuWide}>
      <h1 className={styles.title}>{doc.title}</h1>
      {doc.sections.map((section) => (
        <section key={section.heading}>
          <h2 className={styles.tutStep}>{section.heading}</h2>
          <p className={styles.subtitle}>{section.body}</p>
        </section>
      ))}
      <div className={styles.actions}>
        <a className={`${styles.secondary} ${legalStyles.back}`} href="/">
          Indietro
        </a>
      </div>
    </div>
  );
};
