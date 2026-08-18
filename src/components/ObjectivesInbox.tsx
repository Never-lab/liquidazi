import { useEffect, useRef, useState } from "react";
import { MILESTONE_DEFS, nextObjectives } from "../sim/milestones";
import { useGameStore } from "../store/gameStore";
import { Icon } from "../ui/icons";
import styles from "./NotificationInbox.module.css";

export const ObjectivesInbox = () => {
  const game = useGameStore((s) => s.game);
  const setScreen = useGameStore((s) => s.setScreen);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const next = nextObjectives(game, 3);
  const done = (game.milestones ?? []).length;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-label="Obiettivi della run"
        aria-expanded={open}
        title="Obiettivi della run"
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="trophy" size={18} />
      </button>
      {open && (
        <div className={styles.panel} role="dialog" aria-label="Obiettivi">
          <div className={styles.head}>
            <strong>Obiettivi</strong>
            <button
              type="button"
              className={styles.close}
              aria-label="Chiudi obiettivi"
              onClick={() => setOpen(false)}
            >
              Chiudi
            </button>
          </div>
          {next.length === 0 ? (
            <p className={styles.empty}>
              Run completata ({done}/{MILESTONE_DEFS.length})
            </p>
          ) : (
            <ul className={styles.list}>
              {next.map((m) => (
                <li key={m.id}>
                  <span className={styles.text}>
                    <strong>{m.label}</strong>
                  </span>
                  <span className={styles.when}>{m.blurb}</span>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className={styles.close}
            style={{ marginTop: 8 }}
            onClick={() => {
              setOpen(false);
              setScreen("objectives");
            }}
          >
            Tutti ({done}/{MILESTONE_DEFS.length})
          </button>
        </div>
      )}
    </div>
  );
};
