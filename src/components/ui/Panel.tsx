import type { ReactNode } from "react";
import styles from "./ui.module.css";

type Props = {
  title?: string;
  wide?: boolean;
  children: ReactNode;
  className?: string;
  head?: ReactNode;
};

export const Panel = ({ title, wide, children, className, head }: Props) => (
  <section className={`${wide ? styles.panelWide : styles.panel} ${className ?? ""}`}>
    {(title || head) && (
      <div className={styles.panelHead}>
        {title ? <h2 className={styles.panelTitle}>{title}</h2> : null}
        {head}
      </div>
    )}
    {children}
  </section>
);
