import { useMemo, useState } from "react";
import { SECTORS, ZONES, type SectorId, type ZoneId } from "../config/market";
import { formatCash } from "../components/formatCash";
import { marketModifiers, rivalsFor } from "../sim/market";
import { useGameStore } from "../store/gameStore";
import styles from "./MenuScreen.module.css";

export const SetupScreen = () => {
  const newGame = useGameStore((s) => s.newGame);
  const setScreen = useGameStore((s) => s.setScreen);
  const [name, setName] = useState("La Mia SRL");
  const [zone, setZone] = useState<ZoneId>("lazio");
  const [sector, setSector] = useState<SectorId>("servizi");

  const rivals = rivalsFor(zone, sector);
  const mods = useMemo(() => marketModifiers(rivals), [rivals]);
  const rent = ZONES.find((z) => z.id === zone)!.monthlyRent;
  const pricePct = Math.round((mods.priceFactor - 1) * 100);
  const costPct = Math.round((mods.costFactor - 1) * 100);

  return (
    <div className={styles.menu}>
      <h2 className={styles.title}>Nuova azienda</h2>
      <p className={styles.subtitle}>
        Scegli zona e settore: la concorrenza locale cambia prezzi e costi.
      </p>

      <label className={styles.field}>
        <span>Ragione sociale</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
      </label>

      <label className={styles.field}>
        <span>Zona</span>
        <select value={zone} onChange={(e) => setZone(e.target.value as ZoneId)}>
          {ZONES.map((z) => (
            <option key={z.id} value={z.id}>{z.label}</option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span>Settore</span>
        <select value={sector} onChange={(e) => setSector(e.target.value as SectorId)}>
          {SECTORS.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </label>

      <div className={styles.preview}>
        <p><strong>Concorrenza:</strong> {rivals} rivali · pressione {mods.pressureLabel}</p>
        <p>
          Prezzi vendita: {pricePct >= 0 ? "+" : ""}{pricePct}% ·
          Costi acquisto: {costPct >= 0 ? "+" : ""}{costPct}%
        </p>
        <p>Affitto / locale: {formatCash(rent)} / mese</p>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.primary}
          onClick={() => newGame({ name, zone, sector })}
        >
          Apri l&apos;azienda
        </button>
        <button className={styles.secondary} onClick={() => setScreen("menu")}>
          Indietro
        </button>
      </div>
    </div>
  );
};
