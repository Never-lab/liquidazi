/**
 * Market geography + competition pack.
 * Raw figures live in marketPack.json (InfoCamere / ISTAT / rent averages).
 * Do not invent rival counts — read from the pack.
 */
import pack from "./marketPack.json";

export type SectorId = "commercio" | "servizi" | "artigianato" | "ristorazione";
export type RegionId = (typeof pack.cities)[number]["regionId"];
export type CityId = (typeof pack.cities)[number]["id"];

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
  provinceCode: string;
  regionId: RegionId;
  regionLabel: string;
  population: number;
  firmsTotal: number;
  firmsBySector: Record<SectorId, number>;
  monthlyRent: number;
  rentEurPerSqmMonth: number;
  densityPer10k: Record<SectorId, number>;
  densityIndex: Record<SectorId, number>;
}

export const MARKET_PACK_META = {
  version: pack.version,
  asOf: pack.asOf,
  localeSqmAssumption: pack.localeSqmAssumption,
  sources: pack.sources,
  notes: pack.notes,
} as const;

export const SECTORS: SectorDef[] = [
  { id: "commercio", label: "Commercio", ateco: "G" },
  { id: "servizi", label: "Servizi professionali / supporto", ateco: "N+O" },
  { id: "artigianato", label: "Manifattura / artigianato", ateco: "C" },
  { id: "ristorazione", label: "Alloggio e ristorazione", ateco: "I" },
];

export const CITIES: CityDef[] = pack.cities as CityDef[];

export const REGIONS: RegionDef[] = Array.from(
  new Map(CITIES.map((c) => [c.regionId, { id: c.regionId, label: c.regionLabel }])).values(),
).sort((a, b) => a.label.localeCompare(b.label, "it"));

export const cityById = (id: CityId): CityDef => {
  const c = CITIES.find((x) => x.id === id);
  if (!c) throw new Error(`unknown city ${id}`);
  return c;
};

export const citiesInRegion = (regionId: RegionId): CityDef[] =>
  CITIES.filter((c) => c.regionId === regionId).sort((a, b) =>
    a.label.localeCompare(b.label, "it"),
  );

export const sectorById = (id: SectorId): SectorDef => {
  const s = SECTORS.find((x) => x.id === id);
  if (!s) throw new Error(`unknown sector ${id}`);
  return s;
};

/** Firms already active in the province for that game sector (InfoCamere). */
export const firmsInSector = (cityId: CityId, sector: SectorId): number =>
  cityById(cityId).firmsBySector[sector];

/** Competition pressure index vs pack median (1 = median). */
export const densityIndexFor = (cityId: CityId, sector: SectorId): number =>
  cityById(cityId).densityIndex[sector];
