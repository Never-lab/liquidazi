/**
 * Market geography from ISTAT (all regions + comuni) + InfoCamere provincial firm stocks.
 */
import geo from "./istatGeo.json";
import firms from "./provinceFirms.json";

export type SectorId = "commercio" | "servizi" | "artigianato" | "ristorazione";
export type RegionId = string;
export type CityId = string; // ISTAT codice comune alfanumerico (6)

export interface SectorDef {
  id: SectorId;
  label: string;
  ateco: string;
}

export interface RegionDef {
  id: RegionId;
  label: string;
}

export interface CityDef {
  id: CityId;
  label: string;
  regionId: RegionId;
  regionLabel: string;
  provinceCode: string;
  provinceLabel: string;
  capoluogo: boolean;
  population: number | null;
}

export const MARKET_PACK_META = {
  geoSource: geo.source,
  geoAsOf: geo.asOf,
  firmsSource: firms.source,
  firmsAsOf: firms.asOf,
  localeSqmAssumption: firms.localeSqmAssumption,
  notes: firms.notes,
  populationSource: geo.populationSource,
} as const;

export const SECTORS: SectorDef[] = [
  { id: "commercio", label: "Commercio", ateco: "G" },
  { id: "servizi", label: "Servizi professionali / supporto", ateco: "N+O" },
  { id: "artigianato", label: "Manifattura / artigianato", ateco: "C" },
  { id: "ristorazione", label: "Alloggio e ristorazione", ateco: "I" },
];

export const REGIONS: RegionDef[] = (geo.regions as RegionDef[]).slice().sort((a, b) =>
  a.label.localeCompare(b.label, "it"),
);

const regionLabel = Object.fromEntries(REGIONS.map((r) => [r.id, r.label]));

export const CITIES: CityDef[] = (geo.comuni as Array<{
  id: string;
  label: string;
  regionId: string;
  provinceCode: string;
  provinceLabel: string;
  capoluogo: boolean;
  population: number | null;
}>).map((c) => ({
  ...c,
  regionLabel: regionLabel[c.regionId] ?? c.regionId,
}));

const cityIndex = new Map(CITIES.map((c) => [c.id, c]));

export const cityById = (id: CityId): CityDef => {
  const c = cityIndex.get(id);
  if (!c) throw new Error(`unknown city ${id}`);
  return c;
};

export const citiesInRegion = (regionId: RegionId): CityDef[] =>
  CITIES.filter((c) => c.regionId === regionId);

export const sectorById = (id: SectorId): SectorDef => {
  const s = SECTORS.find((x) => x.id === id);
  if (!s) throw new Error(`unknown sector ${id}`);
  return s;
};

const provinceFirms = firms.provinces as Record<
  string,
  {
    firmsBySector: Record<SectorId, number>;
    firmsTotal: number;
  }
>;

const provinceRent = firms.provinceRentEurPerSqmMonth as Record<string, number>;
const regionRent = firms.regionRentEurPerSqmMonth as Record<string, number>;
const localeSqm = firms.localeSqmAssumption as number;

/** Pop. provinciale = somma comuni ISTAT (stesso livello dello stock InfoCamere). */
const provincePopulation: Record<string, number> = {};
for (const c of CITIES) {
  if (c.population && c.population > 0) {
    provincePopulation[c.provinceCode] =
      (provincePopulation[c.provinceCode] ?? 0) + c.population;
  }
}

const provinceDensityPer10k = (provinceCode: string, sector: SectorId): number | null => {
  const firmsN = provinceFirms[provinceCode]?.firmsBySector[sector] ?? 0;
  const pop = provincePopulation[provinceCode];
  if (!pop || pop <= 0) return null;
  return (firmsN / pop) * 10000;
};

/** Mediana densità tra province con dati (coerente imprese/pop. stesso livello). */
const sectorMedianPer10k = ((): Record<SectorId, number> => {
  const out = {} as Record<SectorId, number>;
  for (const sector of SECTORS.map((s) => s.id)) {
    const vals = Object.keys(provinceFirms)
      .map((code) => provinceDensityPer10k(code, sector))
      .filter((v): v is number => v !== null)
      .sort((a, b) => a - b);
    out[sector] = vals.length ? vals[Math.floor(vals.length / 2)]! : 1;
  }
  return out;
})();

export const firmsInSector = (cityId: CityId, sector: SectorId): number => {
  const city = cityById(cityId);
  return provinceFirms[city.provinceCode]?.firmsBySector[sector] ?? 0;
};

export const provincePopulationFor = (cityId: CityId): number => {
  const city = cityById(cityId);
  return provincePopulation[city.provinceCode] ?? city.population ?? 0;
};

export const densityPer10k = (cityId: CityId, sector: SectorId): number => {
  const city = cityById(cityId);
  const d = provinceDensityPer10k(city.provinceCode, sector);
  return d ?? sectorMedianPer10k[sector] ?? 1;
};

export const densityIndexFor = (cityId: CityId, sector: SectorId): number => {
  const d = densityPer10k(cityId, sector);
  const med = sectorMedianPer10k[sector] || 1;
  return d / med;
};

export const monthlyRentFor = (cityId: CityId): number => {
  const city = cityById(cityId);
  const eurMq =
    provinceRent[city.provinceCode] ??
    regionRent[city.regionId] ??
    10;
  return Math.round(eurMq * localeSqm);
};

export const rentEurPerSqmFor = (cityId: CityId): number => {
  const city = cityById(cityId);
  return provinceRent[city.provinceCode] ?? regionRent[city.regionId] ?? 10;
};

/** Default city for tests / bare init: Parma (ISTAT 034027). */
export const DEFAULT_CITY_ID: CityId = "034027";
