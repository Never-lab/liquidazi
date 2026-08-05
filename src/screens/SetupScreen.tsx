import { useMemo, useState } from "react";
import {
  REGIONS,
  SECTORS,
  citiesInRegion,
  cityById,
  monthlyRentFor,
  rentEurPerSqmFor,
  type CityId,
  type RegionId,
  type SectorId,
} from "../config/market";
import { formatCash } from "../components/formatCash";
import { marketModifiersFor } from "../sim/market";
import { useGameStore } from "../store/gameStore";
import styles from "./MenuScreen.module.css";

const firstCapoluogo = (regionId: RegionId): CityId => {
  const list = citiesInRegion(regionId);
  return (list.find((c) => c.capoluogo) ?? list[0]!).id;
};

export const SetupScreen = () => {
  const newGame = useGameStore((s) => s.newGame);
  const setScreen = useGameStore((s) => s.setScreen);
  const [name, setName] = useState("La Mia SRL");
  const [region, setRegion] = useState<RegionId>("12"); // Lazio
  const [city, setCity] = useState<CityId>(() => firstCapoluogo("12"));
  const [sector, setSector] = useState<SectorId>("servizi");
  const [filter, setFilter] = useState("");

  const onRegion = (id: RegionId) => {
    setRegion(id);
    setFilter("");
    setCity(firstCapoluogo(id));
  };

  const cityOptions = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = citiesInRegion(region);
    const filtered = q
      ? list.filter(
          (c) =>
            c.label.toLowerCase().includes(q) ||
            c.provinceCode.toLowerCase().includes(q),
        )
      : list.filter((c) => c.capoluogo).concat(list.filter((c) => !c.capoluogo));
    // Capoluoghi first when no filter; cap search results at 250 for UI sanity
    return filtered.slice(0, 250);
  }, [region, filter]);

  const spot = cityById(city);
  const mods = useMemo(() => marketModifiersFor(city, sector), [city, sector]);
  const pricePct = Math.round((mods.priceFactor - 1) * 100);
  const costPct = Math.round((mods.costFactor - 1) * 100);
  const sectorDef = SECTORS.find((s) => s.id === sector)!;
  const totalInRegion = citiesInRegion(region).length;

  return (
    <div className={styles.menu}>
      <h2 className={styles.title}>Nuova azienda</h2>
      <p className={styles.subtitle}>
        {REGIONS.length} regioni e {totalInRegion.toLocaleString("it-IT")} comuni ISTAT in
        questa regione. Concorrenza da stock InfoCamere provinciale.
      </p>

      <label className={styles.field}>
        <span>Ragione sociale</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
      </label>

      <label className={styles.field}>
        <span>Regione (ISTAT)</span>
        <select value={region} onChange={(e) => onRegion(e.target.value)}>
          {REGIONS.map((r) => (
            <option key={r.id} value={r.id}>{r.label}</option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span>Cerca comune</span>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Digita nome o sigla provincia (es. Milano, MI)"
        />
      </label>

      <label className={styles.field}>
        <span>Città / comune ({totalInRegion.toLocaleString("it-IT")} in regione)</span>
        <select value={city} onChange={(e) => setCity(e.target.value)}>
          {cityOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label} ({c.provinceCode}){c.capoluogo ? " · capoluogo" : ""}
            </option>
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
          <strong>{spot.label}</strong> · {spot.provinceLabel} ({spot.provinceCode}) ·{" "}
          {spot.regionLabel}
          {spot.population
            ? ` · pop. ${spot.population.toLocaleString("it-IT")}`
            : ""}
        </p>
        <p>
          <strong>Imprese attive in provincia ({sectorDef.ateco}):</strong>{" "}
          {mods.firmsInSector.toLocaleString("it-IT")}
        </p>
        <p>
          Densità: {mods.densityPer10k.toLocaleString("it-IT", { maximumFractionDigits: 1 })} /
          10.000 ab. · indice {mods.densityIndex.toFixed(2)} · pressione {mods.pressureLabel}
        </p>
        <p>
          Prezzi vendita: {pricePct >= 0 ? "+" : ""}{pricePct}% ·
          Costi acquisto: {costPct >= 0 ? "+" : ""}{costPct}%
        </p>
        <p>
          Affitto stimato: {formatCash(monthlyRentFor(city))} / mese
          ({rentEurPerSqmFor(city).toLocaleString("it-IT")} €/mq × 80 mq)
        </p>
        <p className={styles.previewNote}>
          Geografia: elenco comuni ISTAT. Imprese: InfoCamere Dic 2025 a livello
          provinciale. Affitto: medie €/mq di mercato (non quotazione OMI puntuale).
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
