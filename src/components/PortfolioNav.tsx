import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchMarketHistory, fetchMarketQuote, searchMarkets } from "../api/markets";
import { maxPortfolioOps, PORTFOLIO_MIN_BUY } from "../config/portfolio";
import {
  portfolioOpsRemaining,
  portfolioTotalValue,
  positionMarketValue,
} from "../sim/portfolio";
import { useGameStore } from "../store/gameStore";
import { portfolioBuyHint, portfolioSellHint } from "../ui/controlHints";
import { formatCash } from "./formatCash";
import { Hint } from "./ui/Hint";
import { Sheet } from "./ui/Sheet";
import { Icon } from "../ui/icons";
import styles from "./NotificationInbox.module.css";
import panelStyles from "./panels.module.css";

const ASSET_LABEL: Record<string, string> = {
  etf: "ETF",
  equity: "Azione",
  bond: "Obbligazione",
  fund: "Fondo",
  other: "Altro",
};

const PortfolioSparkline = ({ values }: { values: number[] }) => {
  if (values.length < 2) return null;
  const w = 280;
  const h = 56;
  const min = Math.min(...values);
  const max = Math.max(...values, min + 1);
  const pts = values
    .map((v, i) => {
      const x = 4 + (i / (values.length - 1)) * (w - 8);
      const y = 4 + (h - 8) - ((v - min) / (max - min)) * (h - 8);
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={panelStyles.sparkChart} aria-hidden>
      <polyline fill="none" stroke="var(--color-accent)" strokeWidth="2" points={pts} />
    </svg>
  );
};

export const PortfolioNav = () => {
  const game = useGameStore((s) => s.game);
  const buyPortfolio = useGameStore((s) => s.buyPortfolio);
  const sellPortfolio = useGameStore((s) => s.sellPortfolio);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<
    { symbol: string; label: string; exchange: string; quoteType: string }[]
  >([]);
  const [selected, setSelected] = useState<{
    symbol: string;
    label: string;
    quoteType: string;
    priceEur: number;
  } | null>(null);
  const [buyAmount, setBuyAmount] = useState("1000");
  const [sellPct, setSellPct] = useState<Record<string, string>>({});
  const [positionHistory, setPositionHistory] = useState<Record<string, number[]>>({});

  const positions = game.portfolio ?? [];
  const total = portfolioTotalValue(game);
  const opsMax = maxPortfolioOps(game.monthsPlayed);
  const opsLeft = portfolioOpsRemaining(game);
  const invested = positions.reduce((s, p) => s + p.shares * p.avgCostEur, 0);
  const pnl = total - invested;

  const loadSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearchError(null);
      return;
    }
    setSearching(true);
    setSearchError(null);
    try {
      const data = await searchMarkets(trimmed);
      setResults(data.quotes);
    } catch {
      setResults([]);
      setSearchError("Ricerca non disponibile. Controlla la connessione.");
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => void loadSearch(query), 300);
    return () => window.clearTimeout(t);
  }, [query, open, loadSearch]);

  const positionSymbols = useMemo(
    () => positions.map((p) => p.symbol).join(","),
    [positions],
  );

  useEffect(() => {
    if (!open || positions.length === 0) return;
    let cancelled = false;
    void (async () => {
      const next: Record<string, number[]> = {};
      for (const p of positions) {
        try {
          const hist = await fetchMarketHistory(p.symbol, "3mo");
          next[p.symbol] = hist.points.slice(-24).map((pt) => pt.close);
        } catch {
          next[p.symbol] = [p.avgCostEur, p.lastPriceEur ?? p.avgCostEur];
        }
      }
      if (!cancelled) setPositionHistory(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, positionSymbols, positions]);

  const pickSymbol = async (symbol: string, label: string, quoteType: string) => {
    try {
      const quote = await fetchMarketQuote(symbol);
      setSelected({
        symbol: quote.symbol,
        label: quote.label || label,
        quoteType: quote.quoteType || quoteType,
        priceEur: quote.priceEur,
      });
      setSearchError(null);
    } catch {
      setSearchError("Quotazione non disponibile per questo titolo.");
    }
  };

  const doBuy = () => {
    if (!selected) return;
    const amount = Number(buyAmount);
    buyPortfolio({
      symbol: selected.symbol,
      label: selected.label,
      amountEur: amount,
      priceEur: selected.priceEur,
      quoteType: selected.quoteType,
      liquid: selected.quoteType.toUpperCase().includes("MONEY"),
    });
  };

  const doSell = (symbol: string, shares: number, price: number) => {
    sellPortfolio(symbol, shares, price);
  };

  const portfolioHistoryValues = useMemo(
    () => (game.portfolioHistory ?? []).map((h) => h.valueEur),
    [game.portfolioHistory],
  );

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        aria-label="Portafoglio investimenti"
        aria-expanded={open}
        title={
          total > 0
            ? `Portafoglio: ${formatCash(total)} · ${opsLeft}/${opsMax} op.`
            : `Investimenti · ${opsLeft}/${opsMax} operazioni`
        }
        onClick={() => setOpen(true)}
      >
        <Icon name="growth" size={18} />
      </button>

      <Sheet open={open} title="Portafoglio" onClose={() => setOpen(false)}>
        <section className={panelStyles.panelWide} style={{ border: "none", padding: 0 }}>
          <p className={panelStyles.muted}>
            Cerca ticker reali (ETF, obbligazioni, azioni). Ogni acquisto o vendita consuma un&apos;operazione
            mensile ({opsLeft}/{opsMax} rimaste). Le plusvalenze in vendita confluiscono nel bilancio fiscale.
          </p>

          <div className={panelStyles.kpiRow}>
            <div className={panelStyles.kpiCard}>
              <span className={panelStyles.kpiLabel}>Valore portafoglio</span>
              <strong>{formatCash(total)}</strong>
            </div>
            <div className={panelStyles.kpiCard}>
              <span className={panelStyles.kpiLabel}>P/L latente</span>
              <strong className={pnl >= 0 ? panelStyles.pos : panelStyles.neg}>
                {pnl >= 0 ? "+" : ""}
                {formatCash(pnl)}
              </strong>
            </div>
            <div className={panelStyles.kpiCard}>
              <span className={panelStyles.kpiLabel}>Operazioni mese</span>
              <strong>
                {opsLeft}/{opsMax}
              </strong>
            </div>
          </div>

          {portfolioHistoryValues.length >= 2 && (
            <div className={panelStyles.chartBlock}>
              <h3 className={panelStyles.panelTitle}>Andamento portafoglio</h3>
              <PortfolioSparkline values={portfolioHistoryValues} />
            </div>
          )}

          <h3 className={panelStyles.panelTitle} style={{ marginTop: 16 }}>
            Nuovo ordine
          </h3>
          <div className={panelStyles.row}>
            <input
              className={panelStyles.input}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca ticker o nome (es. VWCE, Apple…)"
              aria-label="Cerca titolo"
            />
          </div>
          {searching && <p className={panelStyles.muted}>Ricerca…</p>}
          {searchError && <p className={panelStyles.warn}>{searchError}</p>}
          {results.length > 0 && (
            <ul className={panelStyles.pickList}>
              {results.map((r) => (
                <li key={r.symbol}>
                  <button
                    type="button"
                    className={panelStyles.pickBtn}
                    onClick={() => void pickSymbol(r.symbol, r.label, r.quoteType)}
                  >
                    <strong>{r.symbol}</strong>
                    <span>
                      {r.label} · {r.exchange}{" "}
                      {ASSET_LABEL[r.quoteType?.toLowerCase()] ?? r.quoteType}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {selected && (
            <div className={panelStyles.orderBox}>
              <p>
                <strong>{selected.symbol}</strong> · {selected.label} ·{" "}
                {formatCash(selected.priceEur)}/quote
              </p>
              <div className={panelStyles.row}>
                <input
                  className={panelStyles.input}
                  type="number"
                  min={PORTFOLIO_MIN_BUY}
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(e.target.value)}
                  aria-label="Importo acquisto"
                />
                <Hint
                  text={portfolioBuyHint({
                    noOps: opsLeft <= 0,
                    belowMin: Number(buyAmount) < PORTFOLIO_MIN_BUY,
                    shortCash: game.company.cash < Number(buyAmount),
                    minLabel: formatCash(PORTFOLIO_MIN_BUY),
                  })}
                >
                  <button
                    type="button"
                    className={panelStyles.button}
                    disabled={
                      opsLeft <= 0 ||
                      Number(buyAmount) < PORTFOLIO_MIN_BUY ||
                      game.company.cash < Number(buyAmount)
                    }
                    onClick={doBuy}
                  >
                    Compra
                  </button>
                </Hint>
              </div>
            </div>
          )}

          <h3 className={panelStyles.panelTitle} style={{ marginTop: 16 }}>
            Posizioni ({positions.length})
          </h3>
          {positions.length === 0 ? (
            <p className={panelStyles.muted}>
              Nessuna posizione. Parcheggia utile in ETF/obbligazioni: le posizioni marcate liquidità servono
              anche da fondo emergenza.
            </p>
          ) : (
            <ul className={panelStyles.list}>
              {positions.map((p) => {
                const mv = positionMarketValue(p);
                const cost = p.shares * p.avgCostEur;
                const rowPnl = mv - cost;
                const price = p.lastPriceEur ?? p.avgCostEur;
                const pct = Number(sellPct[p.symbol] ?? "100");
                const sellShares = (p.shares * pct) / 100;
                return (
                  <li key={p.symbol} className={panelStyles.portfolioRow}>
                    <div className={panelStyles.portfolioHead}>
                      <div>
                        <strong>{p.symbol}</strong>
                        <span className={panelStyles.muted}>
                          {" "}
                          · {p.label}
                          {p.liquid ? " · liquidità" : ""} · {ASSET_LABEL[p.assetClass] ?? p.assetClass}
                        </span>
                      </div>
                      <span>{formatCash(mv)}</span>
                    </div>
                    {positionHistory[p.symbol] && (
                      <PortfolioSparkline values={positionHistory[p.symbol]!} />
                    )}
                    <p className={panelStyles.muted}>
                      {p.shares.toFixed(4)} quote · prezzo {formatCash(price)} · P/L{" "}
                      <span className={rowPnl >= 0 ? panelStyles.pos : panelStyles.neg}>
                        {rowPnl >= 0 ? "+" : ""}
                        {formatCash(rowPnl)}
                      </span>
                    </p>
                    <div className={panelStyles.row}>
                      <input
                        className={panelStyles.input}
                        type="number"
                        min={1}
                        max={100}
                        value={sellPct[p.symbol] ?? "100"}
                        onChange={(e) =>
                          setSellPct((prev) => ({ ...prev, [p.symbol]: e.target.value }))
                        }
                        aria-label={`Percentuale vendita ${p.symbol}`}
                      />
                      <span className={panelStyles.muted}>%</span>
                      <Hint
                        text={portfolioSellHint({
                          noOps: opsLeft <= 0,
                          invalidPct: !(pct > 0 && pct <= 100),
                        })}
                      >
                        <button
                          type="button"
                          className={panelStyles.buttonSecondary}
                          disabled={opsLeft <= 0 || !(pct > 0 && pct <= 100)}
                          onClick={() => doSell(p.symbol, sellShares, price)}
                        >
                          Vendi
                        </button>
                      </Hint>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </Sheet>
    </>
  );
};
