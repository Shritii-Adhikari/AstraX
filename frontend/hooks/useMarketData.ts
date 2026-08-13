"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchSpotPrices, fetchMarket24h, type Market24h } from "@/lib/marketData";

/** Live spot prices (Coinbase → CoinGecko → Binance). Refreshes every 30s. */
export function useSpotPrices() {
  return useQuery({
    queryKey: ["spot-prices"],
    queryFn: fetchSpotPrices,
    refetchInterval: 30_000,
    staleTime: 25_000,
    retry: 2,
  });
}

/** 24h hourly price series + high/low/change for the chart. Refreshes every 60s. */
export function useMarket24h() {
  return useQuery<Market24h>({
    queryKey: ["market-24h"],
    queryFn: fetchMarket24h,
    refetchInterval: 60_000,
    staleTime: 50_000,
    retry: 2,
  });
}
