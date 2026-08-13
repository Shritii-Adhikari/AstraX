"use client";

import { useQuery } from "@tanstack/react-query";
import { simulateContractRead, parseSlot0, parseU128 } from "@/lib/stellar";
import { POOL_ADDRESS } from "@/lib/stellar/contracts";
import { sqrtPriceX64ToPrice } from "@/lib/math";
import { fetchSpotPrices } from "@/lib/marketData";

export interface PoolState {
  // sqrtPriceX64 and tick come from on-chain slot0 — used for all transaction math
  // (getLiquidityForAmounts, getAmountsForLiquidity, price0Only, price1Only).
  // Using on-chain values ensures approvals and amounts match exactly what the
  // contract computes, preventing "not enough allowance" and slippage errors.
  sqrtPriceX64: bigint;    // on-chain (for getLiquidityForAmounts / approvals)
  tick: number;             // on-chain (for price0Only / price1Only)
  feeProtocol: number;
  unlocked: boolean;
  liquidity: bigint;
  feeGrowthGlobal0: bigint;
  feeGrowthGlobal1: bigint;
  currentPrice: number;     // CoinGecko/Binance XLM/USDC — display and range init only
  isPriceStale: boolean;    // true when both CoinGecko and Binance fail
  lastFetchedAt: number;
}

async function fetchMarketPrice(): Promise<number> {
  // Shared source: Coinbase → CoinGecko → Binance. Returns USD per XLM, 0 on failure.
  try {
    const { xlmUsd } = await fetchSpotPrices();
    return xlmUsd > 0 ? xlmUsd : 0;
  } catch {
    return 0;
  }
}

async function fetchPoolState(): Promise<PoolState> {
  const [slot0ScVal, liqScVal, fg0ScVal, fg1ScVal, liveUsdPerXlmResult] = await Promise.allSettled([
    simulateContractRead(POOL_ADDRESS, "slot0", []),
    simulateContractRead(POOL_ADDRESS, "liquidity", []),
    simulateContractRead(POOL_ADDRESS, "fee_growth_global_0", []),
    simulateContractRead(POOL_ADDRESS, "fee_growth_global_1", []),
    fetchMarketPrice(),
  ]);

  // Non-price on-chain state
  const slot0 =
    slot0ScVal.status === "fulfilled" && slot0ScVal.value
      ? parseSlot0(slot0ScVal.value)
      : { sqrtPriceX64: 0n, tick: 0, feeProtocol: 0, unlocked: true };

  const liquidity =
    liqScVal.status === "fulfilled" && liqScVal.value
      ? parseU128(liqScVal.value) : 0n;

  const feeGrowthGlobal0 =
    fg0ScVal.status === "fulfilled" && fg0ScVal.value
      ? parseU128(fg0ScVal.value) : 0n;

  const feeGrowthGlobal1 =
    fg1ScVal.status === "fulfilled" && fg1ScVal.value
      ? parseU128(fg1ScVal.value) : 0n;

  const liveUsdPerXlm = liveUsdPerXlmResult.status === "fulfilled" ? liveUsdPerXlmResult.value : 0;

  // Always use on-chain values for transaction math — prevents amount/approval mismatches.
  const sqrtPriceX64 = slot0.sqrtPriceX64;
  const tick = slot0.tick;

  // CoinGecko/Binance price is used only for display and initial range suggestion.
  let currentPrice: number;
  let isPriceStale: boolean;

  if (liveUsdPerXlm > 0) {
    currentPrice = 1 / liveUsdPerXlm;  // XLM/USDC for display
    isPriceStale = false;
  } else {
    // Both APIs failed — derive display price from on-chain sqrt
    currentPrice = sqrtPriceX64ToPrice(slot0.sqrtPriceX64);
    isPriceStale = true;
  }

  return {
    sqrtPriceX64,
    tick,
    feeProtocol: slot0.feeProtocol,
    unlocked: slot0.unlocked,
    liquidity,
    feeGrowthGlobal0,
    feeGrowthGlobal1,
    currentPrice,
    isPriceStale,
    lastFetchedAt: Date.now(),
  };
}

export function usePool() {
  return useQuery<PoolState>({
    queryKey: ["pool-state"],
    queryFn: fetchPoolState,
    refetchInterval: 30_000,
    staleTime: 20_000,
    retry: 2,
  });
}
