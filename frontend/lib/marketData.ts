// Centralized live market-data fetching for display (never fed into contract math).
// Spot price source priority: Coinbase → CoinGecko → Binance.
// 24h candles for the price chart: Coinbase Exchange → CoinGecko market_chart.

export interface SpotPrices {
  xlmUsd: number;
  usdcUsd: number;
}

export interface Market24h {
  // Hourly close prices over the last ~24h (USD per XLM), oldest → newest
  series: number[];
  high24h: number;
  low24h: number;
  change24h: number; // fractional, e.g. 0.042 = +4.2%
}

const TIMEOUT = 5000;

function timeout(ms: number) {
  return AbortSignal.timeout(ms);
}

/** Coinbase spot — CORS-friendly, no key, generous rate limits. */
async function coinbaseSpot(pair: string): Promise<number | null> {
  try {
    const res = await fetch(`https://api.coinbase.com/v2/prices/${pair}/spot`, {
      signal: timeout(TIMEOUT),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const amount = parseFloat(json?.data?.amount);
    return amount > 0 ? amount : null;
  } catch {
    return null;
  }
}

async function coingeckoSpot(): Promise<SpotPrices | null> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=stellar,usd-coin&vs_currencies=usd",
      { signal: timeout(TIMEOUT) }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const xlm = json?.stellar?.usd;
    const usdc = json?.["usd-coin"]?.usd;
    if (typeof xlm === "number" && xlm > 0) {
      return { xlmUsd: xlm, usdcUsd: typeof usdc === "number" && usdc > 0 ? usdc : 1 };
    }
    return null;
  } catch {
    return null;
  }
}

async function binanceSpot(): Promise<number | null> {
  try {
    const res = await fetch(
      "https://api.binance.com/api/v3/ticker/price?symbol=XLMUSDT",
      { signal: timeout(TIMEOUT) }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const price = parseFloat(json?.price);
    return price > 0 ? price : null;
  } catch {
    return null;
  }
}

/** Resolve XLM/USD and USDC/USD spot, trying sources in priority order. */
export async function fetchSpotPrices(): Promise<SpotPrices> {
  // Coinbase first (most reliable from the browser).
  const cbXlm = await coinbaseSpot("XLM-USD");
  if (cbXlm) {
    const cbUsdc = await coinbaseSpot("USDC-USD");
    return { xlmUsd: cbXlm, usdcUsd: cbUsdc && cbUsdc > 0 ? cbUsdc : 1 };
  }

  const cg = await coingeckoSpot();
  if (cg) return cg;

  const bn = await binanceSpot();
  if (bn) return { xlmUsd: bn, usdcUsd: 1 };

  throw new Error("All spot price sources failed");
}

/** Coinbase Exchange hourly candles: [time, low, high, open, close, volume]. */
async function coinbaseCandles(): Promise<Market24h | null> {
  try {
    const res = await fetch(
      "https://api.exchange.coinbase.com/products/XLM-USD/candles?granularity=3600",
      { signal: timeout(TIMEOUT) }
    );
    if (!res.ok) return null;
    const rows: number[][] = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return null;
    // API returns newest-first; take last 24 buckets and order oldest → newest.
    const last24 = rows.slice(0, 24).reverse();
    const series = last24.map((r) => r[4]); // close
    const high24h = Math.max(...last24.map((r) => r[2]));
    const low24h = Math.min(...last24.map((r) => r[1]));
    const change24h =
      series.length > 1 ? (series[series.length - 1] - series[0]) / series[0] : 0;
    return { series, high24h, low24h, change24h };
  } catch {
    return null;
  }
}

async function coingeckoChart(): Promise<Market24h | null> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/coins/stellar/market_chart?vs_currency=usd&days=1",
      { signal: timeout(TIMEOUT) }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const prices: [number, number][] = json?.prices ?? [];
    if (prices.length === 0) return null;
    const series = prices.map((p) => p[1]);
    const high24h = Math.max(...series);
    const low24h = Math.min(...series);
    const change24h =
      series.length > 1 ? (series[series.length - 1] - series[0]) / series[0] : 0;
    return { series, high24h, low24h, change24h };
  } catch {
    return null;
  }
}

export async function fetchMarket24h(): Promise<Market24h> {
  const cb = await coinbaseCandles();
  if (cb) return cb;
  const cg = await coingeckoChart();
  if (cg) return cg;
  throw new Error("All 24h market data sources failed");
}
