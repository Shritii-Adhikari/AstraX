"use client";

import { useState, useEffect } from "react";
import { fetchSpotPrices } from "@/lib/marketData";

export interface TokenPrices {
  xlmUsd: number;
  usdcUsd: number;
  isLoading: boolean;
  isError: boolean;
}

export function usePrices(): TokenPrices {
  const [data, setData] = useState<{ xlmUsd: number; usdcUsd: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let active = true;
    const loadPrices = async () => {
      try {
        const prices = await fetchSpotPrices();
        if (active) {
          setData(prices);
          setIsError(false);
        }
      } catch (err) {
        if (active) {
          setIsError(true);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadPrices();
    const interval = setInterval(loadPrices, 30000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return {
    xlmUsd: data?.xlmUsd ?? 0,
    usdcUsd: data?.usdcUsd ?? 1,
    isLoading,
    isError,
  };
}

