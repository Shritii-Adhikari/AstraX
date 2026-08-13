"use client";

import { useQuery } from "@tanstack/react-query";
import { usePool } from "@/hooks/usePool";
import { computeSwapQuote } from "@/lib/math";
import { FEE_TIER } from "@/lib/stellar/assets";

export interface SwapQuote {
  amountOut: bigint;
  priceImpact: number;
  newPrice: number;
  newTick: number;
}

export function useSwapQuote(
  amountIn: bigint,
  zeroForOne: boolean,   // true = XLM → USDC (UI convention)
  currentPrice: number,  // pool.currentPrice — used as fallback for newPrice field
  enabled: boolean
) {
  const { data: pool } = usePool();

  return useQuery<SwapQuote>({
    // Include pool price in key so quote recomputes whenever the pool price ticks
    queryKey: ["swap-quote", amountIn.toString(), zeroForOne, pool?.sqrtPriceX64?.toString() ?? "0"],
    queryFn: (): SwapQuote => {
      if (!pool || pool.liquidity === 0n || amountIn === 0n) {
        return { amountOut: 0n, priceImpact: 0, newPrice: currentPrice, newTick: 0 };
      }

      // UI zeroForOne: true = XLM→USDC (selling XLM = token_1).
      // Pool zero_for_one = true means selling token_0 (USDC).
      // So: poolZeroForOne = !uiZeroForOne.
      const poolZeroForOne = !zeroForOne;

      const amountOut = computeSwapQuote(
        pool.sqrtPriceX64,
        pool.liquidity,
        amountIn,
        poolZeroForOne,
        FEE_TIER,
      );

      return { amountOut, priceImpact: 0, newPrice: pool.currentPrice, newTick: pool.tick };
    },
    enabled: enabled && amountIn > 0n,
    staleTime: 3000,
    refetchInterval: 5000,
    retry: false,
  });
}
