/**
 * Educational market pack: Italian zones + sectors + rivalry counts.
 * Numbers are game design, not ISTAT — they only teach "more rivals → harder margins".
 */

export type ZoneId =
  | "lombardia"
  | "veneto"
  | "emilia"
  | "lazio"
  | "campania"
  | "sicilia";

export type SectorId = "commercio" | "servizi" | "artigianato" | "ristorazione";

export interface ZoneDef {
  id: ZoneId;
  label: string;
  /** flat monthly rent / locale cost (game euros) */
  monthlyRent: number;
}

export interface SectorDef {
  id: SectorId;
  label: string;
}

export const ZONES: ZoneDef[] = [
  { id: "lombardia", label: "Lombardia", monthlyRent: 900 },
  { id: "veneto", label: "Veneto", monthlyRent: 700 },
  { id: "emilia", label: "Emilia-Romagna", monthlyRent: 750 },
  { id: "lazio", label: "Lazio", monthlyRent: 850 },
  { id: "campania", label: "Campania", monthlyRent: 550 },
  { id: "sicilia", label: "Sicilia", monthlyRent: 450 },
];

export const SECTORS: SectorDef[] = [
  { id: "commercio", label: "Commercio" },
  { id: "servizi", label: "Servizi" },
  { id: "artigianato", label: "Artigianato" },
  { id: "ristorazione", label: "Ristorazione" },
];

/** Rivals already in that zone+sector when you open shop. */
export const RIVALRY: Record<ZoneId, Record<SectorId, number>> = {
  lombardia: { commercio: 6, servizi: 5, artigianato: 3, ristorazione: 7 },
  veneto: { commercio: 4, servizi: 3, artigianato: 4, ristorazione: 5 },
  emilia: { commercio: 3, servizi: 3, artigianato: 5, ristorazione: 4 },
  lazio: { commercio: 5, servizi: 4, artigianato: 2, ristorazione: 6 },
  campania: { commercio: 4, servizi: 2, artigianato: 3, ristorazione: 5 },
  sicilia: { commercio: 2, servizi: 1, artigianato: 2, ristorazione: 3 },
};

export const zoneById = (id: ZoneId): ZoneDef => {
  const z = ZONES.find((x) => x.id === id);
  if (!z) throw new Error(`unknown zone ${id}`);
  return z;
};

export const sectorById = (id: SectorId): SectorDef => {
  const s = SECTORS.find((x) => x.id === id);
  if (!s) throw new Error(`unknown sector ${id}`);
  return s;
};
