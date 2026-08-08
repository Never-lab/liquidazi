import {
  useEffect,
  useId,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import { hintOpenReducer } from "../../ui/hintOpen";
import styles from "./ui.module.css";

type Props = {
  text: string;
  children: ReactNode;
  side?: "top" | "bottom";
};

/** Tap/hover hint so disabled controls still explain why (mobile-safe). */
export const Hint = ({ text, children, side = "top" }: Props) => {
  const [open, dispatch] = useReducer(hintOpenReducer, false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        dispatch({ type: "close" });
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dispatch({ type: "close" });
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span
      ref={wrapRef}
      className={styles.hintWrap}
      onMouseEnter={() => dispatch({ type: "open" })}
      onMouseLeave={() => dispatch({ type: "close" })}
      onFocusCapture={() => dispatch({ type: "open" })}
      onBlurCapture={(e) => {
        if (!wrapRef.current?.contains(e.relatedTarget as Node)) {
          dispatch({ type: "close" });
        }
      }}
      onClick={(e) => {
        const btn = (e.target as HTMLElement).closest("button");
        if (btn?.disabled) {
          e.preventDefault();
          dispatch({ type: "toggle" });
          return;
        }
        if (!(e.target as HTMLElement).closest("button,a,input")) {
          dispatch({ type: "toggle" });
        }
      }}
    >
      <span aria-describedby={open ? descId : undefined}>{children}</span>
      {open && (
        <span
          id={descId}
          role="tooltip"
          className={`${styles.hintBubble} ${side === "bottom" ? styles.hintBottom : styles.hintTop}`}
        >
          {text}
        </span>
      )}
    </span>
  );
};
