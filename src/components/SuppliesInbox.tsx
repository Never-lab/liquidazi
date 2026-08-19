import { useEffect, useRef, useState } from "react";
import { qualityLabel } from "../config/supplies";
import { pendingMonths, warehouseMonths } from "../sim/supplies";
import { useGameStore } from "../store/gameStore";
import { Icon } from "../ui/icons";
import styles from "./NotificationInbox.module.css";

export const SuppliesInbox = () => {
  const game = useGameStore((s) => s.game);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const stock = game.supplyStock ?? [];
  const pending = game.pendingSupply ?? [];
  const inMag = warehouseMonths(game);
  const inArrivo = pendingMonths(game);

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
        aria-label="Magazzino scorte"
        aria-expanded={open}
        title={`Scorte: ${inMag} mesi in magazzino${inArrivo > 0 ? `, ${inArrivo} in arrivo` : ""}`}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="crate" size={18} />
      </button>
      {open && (
        <div className={styles.panel} role="dialog" aria-label="Scorte">
          <div className={styles.head}>
            <strong>Magazzino scorte</strong>
            <button
              type="button"
              className={styles.close}
              aria-label="Chiudi scorte"
              onClick={() => setOpen(false)}
            >
              Chiudi
            </button>
          </div>
          <p className={styles.when}>
            In magazzino: <strong>{inMag}</strong> {inMag === 1 ? "mese" : "mesi"}
            {inArrivo > 0 ? ` · in arrivo: ${inArrivo} mesi` : ""}
          </p>
          {(game.highQualityExpectationMonths ?? 0) > 0 && (
            <p className={styles.when}>
              Clienti esigenti: più commesse premium per{" "}
              {game.highQualityExpectationMonths} mesi.
            </p>
          )}
          {stock.length === 0 && pending.length === 0 ? (
            <p className={styles.empty}>Magazzino vuoto — ordina forniture dal tabellone.</p>
          ) : (
            <ul className={styles.list}>
              {stock.map((b, i) => (
                <li key={`s-${i}`}>
                  <span className={styles.text}>
                    <strong>{qualityLabel(b.quality)}</strong>
                  </span>
                  <span className={styles.when}>
                    {b.months} {b.months === 1 ? "mese" : "mesi"} · in magazzino
                  </span>
                </li>
              ))}
              {pending.map((p, i) => (
                <li key={`p-${i}`}>
                  <span className={styles.text}>
                    <strong>{qualityLabel(p.quality)}</strong>
                  </span>
                  <span className={styles.when}>
                    {p.months} {p.months === 1 ? "mese" : "mesi"} · arrivo mese prossimo
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className={styles.when} style={{ marginTop: 8 }}>
            Qualità bassa −10% introito · media +5% · buona +10% (spreco) · ottima +5% (attenzione
            abusi).
          </p>
        </div>
      )}
    </div>
  );
};
