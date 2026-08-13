"use client";

import { useQuery } from "@tanstack/react-query";
import { simulateContractRead, addressToScVal, parseU128 } from "@/lib/stellar";
import { XLM_ADDRESS, USDC_ADDRESS } from "@/lib/stellar/assets";

export interface Balances {
  xlm: bigint; // stroops (7 decimals)
  usdc: bigint; // stroops (7 decimals)
}

/** Reads SAC `balance(address)` for both tokens of the connected wallet. */
async function fetchBalances(address: string): Promise<Balances> {
  const arg = [addressToScVal(address)];
  const [xlmRes, usdcRes] = await Promise.allSettled([
    simulateContractRead(XLM_ADDRESS, "balance", arg),
    simulateContractRead(USDC_ADDRESS, "balance", arg),
  ]);

  const xlm =
    xlmRes.status === "fulfilled" && xlmRes.value ? parseU128(xlmRes.value) : 0n;
  const usdc =
    usdcRes.status === "fulfilled" && usdcRes.value ? parseU128(usdcRes.value) : 0n;

  return { xlm, usdc };
}

export function useBalances(address: string | null) {
  return useQuery<Balances>({
    queryKey: ["balances", address],
    queryFn: () => fetchBalances(address!),
    enabled: !!address,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}
