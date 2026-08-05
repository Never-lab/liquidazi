import { useEffect, useMemo, useState } from "react";
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
import { DIFFICULTIES, DIFFICULTY_LIST, type DifficultyId } from "../config/difficulty";
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
  const preferredDifficulty = useGameStore((s) => s.preferredDifficulty);
  const setPreferredDifficulty = useGameStore((s) => s.setPreferredDifficulty);
  const [name, setName] = useState("La Mia SRL");
  const [region, setRegion] = useState<RegionId>("12");
  const [city, setCity] = useState<CityId>(() => firstCapoluogo("12"));
  const [sector, setSector] = useState<SectorId>("servizi");
  const [filter, setFilter] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyId>(preferredDifficulty);

  const onRegion = (id: RegionId) => {
    setRegion(id);
    setFilter("");
    setCity(firstCapoluogo(id));
  };

  const onDifficulty = (id: DifficultyId) => {
    setDifficulty(id);
    setPreferredDifficulty(id);
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
    return filtered.slice(0, 250);
  }, [region, filter]);

  useEffect(() => {
    if (cityOptions.length === 0) return;
    if (!cityOptions.some((c) => c.id === city)) {
      setCity(cityOptions[0]!.id);
    }
  }, [cityOptions, city]);

  const spot = cityById(city);
  const mods = useMemo(() => marketModifiersFor(city, sector), [city, sector]);
  const diff = DIFFICULTIES[difficulty];
  const pricePct = Math.round((mods.priceFactor - 1) * 100);
  const costPct = Math.round((mods.costFactor - 1) * 100);
  const sectorDef = SECTORS.find((s) => s.id === sector)!;
  const totalInRegion = citiesInRegion(region).length;
  const rent = Math.round(monthlyRentFor(city) * diff.rentFactor);

  return (
    <div className={styles.menu}>
      <h2 className={styles.title}>Nuova azienda</h2>
      <p className={styles.subtitle}>
        {REGIONS.length} regioni · {totalInRegion.toLocaleString("it-IT")} comuni in questa
        regione. Scegli la difficoltà prima di aprire.
      </p>

      <label className={styles.field}>
        <span>Ragione sociale</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
      </label>

      <fieldset className={styles.diffField}>
        <legend>Difficoltà</legend>
        <div className={styles.diffRow}>
          {DIFFICULTY_LIST.map((d) => (
            <button
              key={d.id}
              type="button"
              className={difficulty === d.id ? styles.diffActive : styles.diffBtn}
              onClick={() => onDifficulty(d.id)}
            >
              {d.label}
            </button>
          ))}
        </div>
        <p className={styles.diffBlurb}>{diff.blurb}</p>
      </fieldset>

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
        <span>
          Città / comune
          {filter.trim()
            ? ` · ${cityOptions.length} risultati`
            : ` (${totalInRegion.toLocaleString("it-IT")} in regione)`}
        </span>
        <select
          value={cityOptions.some((c) => c.id === city) ? city : (cityOptions[0]?.id ?? "")}
          onChange={(e) => setCity(e.target.value)}
          disabled={cityOptions.length === 0}
        >
          {cityOptions.length === 0 ? (
            <option value="">Nessun comune trovato in questa regione</option>
          ) : (
            cityOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label} ({c.provinceCode}){c.capoluogo ? " · capoluogo" : ""}
              </option>
            ))
          )}
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
          <strong>Cassa iniziale ({diff.label}):</strong> {formatCash(diff.startingCash)}
        </p>
        <p>
          <strong>Imprese attive in provincia ({sectorDef.ateco}):</strong>{" "}
          {mods.firmsInSector.toLocaleString("it-IT")}
        </p>
        <p>
          Densità provincia: {mods.densityPer10k.toLocaleString("it-IT", { maximumFractionDigits: 1 })} /
          10.000 ab. · indice {mods.densityIndex.toFixed(2)} · pressione {mods.pressureLabel}
        </p>
        <p>
          Prezzi vendita: {pricePct >= 0 ? "+" : ""}{pricePct}% ·
          Costi acquisto: {costPct >= 0 ? "+" : ""}{costPct}%
        </p>
        <p>
          Affitto stimato: {formatCash(rent)} / mese
          ({rentEurPerSqmFor(city).toLocaleString("it-IT")} €/mq × 80 mq
          {diff.rentFactor !== 1 ? ` · ×${diff.rentFactor} difficoltà` : ""})
        </p>
        <p className={styles.previewNote}>
          Geografia ISTAT · imprese InfoCamere provincia · affitto medie €/mq (non OMI puntuale).
        </p>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.primary}
          disabled={cityOptions.length === 0}
          onClick={() => newGame({ name, city, sector, difficulty })}
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
