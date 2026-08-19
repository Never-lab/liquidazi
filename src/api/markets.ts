import { ApiError } from "./client";

export type MarketQuoteResult = {
  symbol: string;
  label: string;
  priceEur: number;
  currency: string;
  quoteType: string;
};

export type MarketSearchResult = {
  quotes: {
    symbol: string;
    label: string;
    exchange: string;
    quoteType: string;
  }[];
};

export type MarketHistoryResult = {
  symbol: string;
  range: string;
  points: { t: number; close: number }[];
};

const getJson = async <T>(path: string): Promise<T> => {
  const res = await fetch(path);
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new ApiError(data.error || `Errore ${res.status}`, res.status);
  return data;
};

export const searchMarkets = (q: string) =>
  getJson<MarketSearchResult>(`/api/markets/search?q=${encodeURIComponent(q)}`);

export const fetchMarketQuote = (symbol: string) =>
  getJson<MarketQuoteResult>(`/api/markets/quote/${encodeURIComponent(symbol)}`);

export const fetchMarketHistory = (symbol: string, range = "6mo") =>
  getJson<MarketHistoryResult>(
    `/api/markets/history/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}`,
  );
