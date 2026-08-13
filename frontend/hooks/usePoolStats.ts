"use client";

import { useQuery } from "@tanstack/react-query";
import { simulateContractRead, addressToScVal, parseU128 } from "@/lib/stellar";
import { POOL_ADDRESS } from "@/lib/stellar/contracts";
import { XLM_ADDRESS, USDC_ADDRESS } from "@/lib/stellar/assets";
import { fromStroops } from "@/lib/math";

export interface PoolReserves {
  xlmReserve: number; // human units
  usdcReserve: number; // human units
}

/** Reads the pool contract's on-chain token balances → real reserves. */
async function fetchReserves(): Promise<PoolReserves> {
  const arg = [addressToScVal(POOL_ADDRESS)];
  const [xlmRes, usdcRes] = await Promise.allSettled([
    simulateContractRead(XLM_ADDRESS, "balance", arg),
    simulateContractRead(USDC_ADDRESS, "balance", arg),
  ]);

  const xlm =
    xlmRes.status === "fulfilled" && xlmRes.value ? parseU128(xlmRes.value) : 0n;
  const usdc =
    usdcRes.status === "fulfilled" && usdcRes.value ? parseU128(usdcRes.value) : 0n;

  return {
    xlmReserve: parseFloat(fromStroops(xlm)),
    usdcReserve: parseFloat(fromStroops(usdc)),
  };
}

export function usePoolReserves() {
  return useQuery<PoolReserves>({
    queryKey: ["pool-reserves"],
    queryFn: fetchReserves,
    refetchInterval: 30_000,
    staleTime: 20_000,
    retry: 2,
  });
}
