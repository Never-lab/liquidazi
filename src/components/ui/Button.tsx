import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./ui.module.css";

type Variant = "primary" | "secondary" | "danger" | "ghost";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
};

export const Button = ({
  variant = "primary",
  className,
  children,
  type = "button",
  ...rest
}: Props) => {
  const v =
    variant === "secondary"
      ? styles.secondary
      : variant === "danger"
        ? styles.danger
        : variant === "ghost"
          ? styles.ghost
          : styles.primary;
  return (
    <button type={type} className={`${styles.btn} ${v} ${className ?? ""}`} {...rest}>
      {children}
    </button>
  );
};
