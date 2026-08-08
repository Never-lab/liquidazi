import { useEffect, useRef, useState } from "react";
import { formatMonthIdx } from "../sim/types";
import { unreadLogCount } from "../sim/notifications";
import { useGameStore } from "../store/gameStore";
import { Icon } from "../ui/icons";
import styles from "./NotificationInbox.module.css";

const INBOX_LIMIT = 12;

export const NotificationInbox = () => {
  const game = useGameStore((s) => s.game);
  const markInboxRead = useGameStore((s) => s.markInboxRead);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const unread = unreadLogCount(game);
  const badge = unread > 9 ? "9+" : unread > 0 ? String(unread) : null;
  const entries = game.log.slice(0, INBOX_LIMIT);

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

  const openInbox = () => {
    setOpen(true);
    if (unread > 0) markInboxRead();
  };

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-label={
          unread > 0
            ? `Notifiche, ${unread} non lette`
            : "Notifiche"
        }
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openInbox())}
      >
        <Icon name="mail" size={18} />
        {badge && <span className={styles.badge}>{badge}</span>}
      </button>
      {open && (
        <div className={styles.panel} role="dialog" aria-label="Notifiche">
          <div className={styles.head}>
            <strong>Notifiche</strong>
            <button
              type="button"
              className={styles.close}
              onClick={() => setOpen(false)}
            >
              Chiudi
            </button>
          </div>
          {entries.length === 0 ? (
            <p className={styles.empty}>Nessun messaggio.</p>
          ) : (
            <ul className={styles.list}>
              {entries.map((e) => (
                <li key={e.id} data-tone={e.tone}>
                  <span className={styles.when}>{formatMonthIdx(e.monthIdx)}</span>
                  <span className={styles.text}>{e.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
