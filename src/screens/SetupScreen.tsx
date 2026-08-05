import { useMemo, useState } from "react";
import {
  REGIONS,
  SECTORS,
  citiesInRegion,
  cityById,
  type CityId,
  type RegionId,
  type SectorId,
} from "../config/market";
import { formatCash } from "../components/formatCash";
import { marketModifiersFor } from "../sim/market";
import { useGameStore } from "../store/gameStore";
import styles from "./MenuScreen.module.css";

export const SetupScreen = () => {
  const newGame = useGameStore((s) => s.newGame);
  const setScreen = useGameStore((s) => s.setScreen);
  const [name, setName] = useState("La Mia SRL");
  const [region, setRegion] = useState<RegionId>("lazio");
  const [city, setCity] = useState<CityId>("roma");
  const [sector, setSector] = useState<SectorId>("servizi");

  const onRegion = (id: RegionId) => {
    setRegion(id);
    setCity(citiesInRegion(id)[0]!.id);
  };

  const spot = cityById(city);
  const mods = useMemo(() => marketModifiersFor(city, sector), [city, sector]);
  const pricePct = Math.round((mods.priceFactor - 1) * 100);
  const costPct = Math.round((mods.costFactor - 1) * 100);
  const sectorDef = SECTORS.find((s) => s.id === sector)!;

  return (
    <div className={styles.menu}>
      <h2 className={styles.title}>Nuova azienda</h2>
      <p className={styles.subtitle}>
        Regione e città con dati InfoCamere / ISTAT: densità di imprese nel settore
        e affitto da medie di mercato €/mq.
      </p>

      <label className={styles.field}>
        <span>Ragione sociale</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
      </label>

      <label className={styles.field}>
        <span>Regione</span>
        <select value={region} onChange={(e) => onRegion(e.target.value as RegionId)}>
          {REGIONS.map((r) => (
            <option key={r.id} value={r.id}>{r.label}</option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span>Città</span>
        <select value={city} onChange={(e) => setCity(e.target.value as CityId)}>
          {citiesInRegion(region).map((c) => (
            <option key={c.id} value={c.id}>{c.label} ({c.provinceCode})</option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span>Settore (ATECO)</span>
        <select value={sector} onChange={(e) => setSector(e.target.value as SectorId)}>
          {SECTORS.map((s) => (
            <option key={s.id} value={s.id}>{s.label} · {s.ateco}</option>
          ))}
        </select>
      </label>

      <div className={styles.preview}>
        <p>
          <strong>Imprese attive in provincia ({sectorDef.ateco}):</strong>{" "}
          {mods.firmsInSector.toLocaleString("it-IT")}
        </p>
        <p>
          Densità: {spot.densityPer10k[sector].toLocaleString("it-IT")} / 10.000 abitanti
          · indice {mods.densityIndex.toFixed(2)} (1 = mediana) · pressione {mods.pressureLabel}
        </p>
        <p>
          Prezzi vendita: {pricePct >= 0 ? "+" : ""}{pricePct}% ·
          Costi acquisto: {costPct >= 0 ? "+" : ""}{costPct}%
        </p>
        <p>
          Affitto stimato: {formatCash(spot.monthlyRent)} / mese
          ({spot.rentEurPerSqmMonth.toLocaleString("it-IT")} €/mq × 80 mq)
        </p>
        <p className={styles.previewNote}>
          Fonti: InfoCamere Dic 2025 (stock provinciale), ISTAT pop. comune, medie annunci
          commerciali. Non è un conteggio di rivali sulla stessa via.
        </p>
      </div>

      <div className={styles.actions}>
        <button className={styles.primary} onClick={() => newGame({ name, city, sector })}>
          Apri l&apos;azienda
        </button>
        <button className={styles.secondary} onClick={() => setScreen("menu")}>
          Indietro
        </button>
      </div>
    </div>
  );
};
