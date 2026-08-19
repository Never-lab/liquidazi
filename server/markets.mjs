/**
 * Live market data proxy (Yahoo Finance) with in-memory cache.
 * Zero deps — Node 20+ fetch.
 */

const CACHE_TTL_MS = 15 * 60 * 1000;
const cache = new Map();

const cached = (key, ttlMs, loader) => {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value;
  return loader().then((value) => {
    cache.set(key, { at: Date.now(), value });
    return value;
  });
};

const yahooFetch = async (url) => {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Floatdesk/1.2 (educational sim)",
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`yahoo ${res.status}`);
  return res.json();
};

const normalizeSymbol = (raw) => String(raw ?? "").trim().toUpperCase();

export const searchMarkets = async (q) => {
  const query = String(q ?? "").trim();
  if (query.length < 1) return { quotes: [] };
  return cached(`search:${query.toLowerCase()}`, CACHE_TTL_MS, async () => {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`;
    const data = await yahooFetch(url);
    const quotes = (data.quotes ?? [])
      .filter((row) => row.symbol && row.shortname)
      .map((row) => ({
        symbol: normalizeSymbol(row.symbol),
        label: row.shortname ?? row.longname ?? row.symbol,
        exchange: row.exchange ?? "",
        quoteType: row.quoteType ?? "EQUITY",
      }));
    return { quotes };
  });
};

export const quoteMarket = async (symbolRaw) => {
  const symbol = normalizeSymbol(symbolRaw);
  if (!symbol) throw new Error("symbol required");
  return cached(`quote:${symbol}`, CACHE_TTL_MS, async () => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`;
    const data = await yahooFetch(url);
    const meta = data.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) throw new Error("quote unavailable");
    return {
      symbol,
      label: meta.shortName ?? meta.longName ?? symbol,
      priceEur: Number(meta.regularMarketPrice),
      currency: meta.currency ?? "EUR",
      quoteType: meta.instrumentType ?? meta.quoteType ?? "EQUITY",
    };
  });
};

export const historyMarket = async (symbolRaw, range = "6mo") => {
  const symbol = normalizeSymbol(symbolRaw);
  if (!symbol) throw new Error("symbol required");
  const allowed = new Set(["1mo", "3mo", "6mo", "1y", "2y"]);
  const r = allowed.has(range) ? range : "6mo";
  return cached(`hist:${symbol}:${r}`, CACHE_TTL_MS, async () => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${r}&interval=1d`;
    const data = await yahooFetch(url);
    const result = data.chart?.result?.[0];
    const timestamps = result?.timestamp ?? [];
    const closes = result?.indicators?.quote?.[0]?.close ?? [];
    const points = timestamps
      .map((t, i) => ({
        t,
        close: closes[i],
      }))
      .filter((p) => typeof p.close === "number" && Number.isFinite(p.close));
    return { symbol, range: r, points };
  });
};

export const validateQuote = async (symbolRaw, clientPrice, maxDrift = 0.02) => {
  const quote = await quoteMarket(symbolRaw);
  const drift = Math.abs(quote.priceEur - clientPrice) / quote.priceEur;
  if (drift > maxDrift) {
    throw new Error("price stale");
  }
  return quote;
};
