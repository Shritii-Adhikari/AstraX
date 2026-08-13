"use client";

import { useState, useEffect } from "react";
import { simulateContractRead, addressToScVal, i32ToScVal, bigintToU128 } from "@/lib/stellar";
import { PM_ADDRESS, POOL_ADDRESS } from "@/lib/stellar/contracts";
import { Q64 } from "@/lib/math";
import {
  getAmountsForLiquidity,
  priceToSqrtPriceX64,
  tickToPrice,
} from "@/lib/math";
import { scValToNative } from "@stellar/stellar-sdk";

export interface Position {
  id: bigint;
  pool: string;
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
  owner: string;
  inRange: boolean;
  priceLower: number;
  priceUpper: number;
  amount0: bigint;
  amount1: bigint;
  tokensOwed0: bigint;
  tokensOwed1: bigint;
  feeGrowthInside0Last: bigint;
  feeGrowthInside1Last: bigint;
}

async function fetchPositionIds(owner: string): Promise<bigint[]> {
  try {
    const result = await simulateContractRead(PM_ADDRESS, "positions_of", [
      addressToScVal(owner),
    ]);
    if (!result) return [];
    const native = scValToNative(result) as unknown[];
    return native.map((v) => BigInt(String(v)));
  } catch {
    return [];
  }
}

async function fetchPositionMeta(id: bigint): Promise<{
  pool: string;
  tick_lower: number;
  tick_upper: number;
  liquidity: string;
} | null> {
  try {
    const result = await simulateContractRead(PM_ADDRESS, "get_position", [
      bigintToU128(id),
    ]);
    if (!result) return null;
    return scValToNative(result) as { pool: string; tick_lower: number; tick_upper: number; liquidity: string; owner: string };
  } catch {
    return null;
  }
}

async function fetchPoolPositionInfo(
  owner: string,
  tickLower: number,
  tickUpper: number,
): Promise<{
  tokens_owed_0: string;
  tokens_owed_1: string;
  fee_growth_inside_0_last: string;
  fee_growth_inside_1_last: string;
} | null> {
  try {
    const result = await simulateContractRead(POOL_ADDRESS, "get_position_info", [
      addressToScVal(owner),
      i32ToScVal(tickLower),
      i32ToScVal(tickUpper),
    ]);
    if (!result) return null;
    return scValToNative(result) as {
      tokens_owed_0: string;
      tokens_owed_1: string;
      fee_growth_inside_0_last: string;
      fee_growth_inside_1_last: string;
    };
  } catch {
    return null;
  }
}

const MASK_128 = (1n << 128n) - 1n;
function wrappingSub128(a: bigint, b: bigint): bigint {
  return ((a - b) & MASK_128);
}

function computeFeeGrowthInside(
  tickLower: number,
  tickUpper: number,
  tickCurrent: number,
  fg0: bigint,
  fg1: bigint,
  lower: { fee_growth_outside_0: string; fee_growth_outside_1: string },
  upper: { fee_growth_outside_0: string; fee_growth_outside_1: string },
): [bigint, bigint] {
  const lo0 = BigInt(lower.fee_growth_outside_0);
  const lo1 = BigInt(lower.fee_growth_outside_1);
  const up0 = BigInt(upper.fee_growth_outside_0);
  const up1 = BigInt(upper.fee_growth_outside_1);

  const below0 = tickCurrent >= tickLower ? lo0 : wrappingSub128(fg0, lo0);
  const below1 = tickCurrent >= tickLower ? lo1 : wrappingSub128(fg1, lo1);
  const above0 = tickCurrent < tickUpper  ? up0 : wrappingSub128(fg0, up0);
  const above1 = tickCurrent < tickUpper  ? up1 : wrappingSub128(fg1, up1);

  return [
    wrappingSub128(wrappingSub128(fg0, below0), above0),
    wrappingSub128(wrappingSub128(fg1, below1), above1),
  ];
}

async function fetchFeeGrowthGlobals(): Promise<{ fg0: bigint; fg1: bigint }> {
  try {
    const [r0, r1] = await Promise.all([
      simulateContractRead(POOL_ADDRESS, "fee_growth_global_0", []),
      simulateContractRead(POOL_ADDRESS, "fee_growth_global_1", []),
    ]);
    const { scValToNative: n } = await import("@stellar/stellar-sdk");
    return {
      fg0: r0 ? BigInt(String(n(r0))) : 0n,
      fg1: r1 ? BigInt(String(n(r1))) : 0n,
    };
  } catch {
    return { fg0: 0n, fg1: 0n };
  }
}

async function fetchTickInfo(tick: number): Promise<{
  fee_growth_outside_0: string;
  fee_growth_outside_1: string;
} | null> {
  try {
    const result = await simulateContractRead(POOL_ADDRESS, "get_tick_info", [
      i32ToScVal(tick),
    ]);
    if (!result) return null;
    return scValToNative(result) as { fee_growth_outside_0: string; fee_growth_outside_1: string };
  } catch {
    return null;
  }
}

async function fetchPoolSlot0(): Promise<{
  sqrt_price_x64: string;
  tick: number;
} | null> {
  try {
    const result = await simulateContractRead(POOL_ADDRESS, "slot0", []);
    if (!result) return null;
    return scValToNative(result) as { sqrt_price_x64: string; tick: number };
  } catch {
    return null;
  }
}

export function usePositions(owner: string | null) {
  const [data, setData] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [trigger, setTrigger] = useState(0);

  const refetch = () => setTrigger((prev) => prev + 1);

  const [prevOwner, setPrevOwner] = useState<string | null>(null);

  if (owner !== prevOwner) {
    setPrevOwner(owner);
    if (!owner) {
      setData([]);
    }
  }

  useEffect(() => {
    if (!owner) {
      return;
    }

    let active = true;
    const fetchAll = async () => {
      setIsLoading(true);
      try {
        const ids = await fetchPositionIds(owner);
        if (ids.length === 0) {
          if (active) {
            setData([]);
            setIsLoading(false);
          }
          return;
        }

        const poolSlot0 = await fetchPoolSlot0();
        const feeGlobals = await fetchFeeGrowthGlobals();

        const sqrtCurrent = poolSlot0
          ? BigInt(String(poolSlot0.sqrt_price_x64))
          : 22880370052176182253n;   // sqrt(1.5385) * 2^64 ≈ 0.65 USDC/XLM
        const currentTick = poolSlot0 ? Number(poolSlot0.tick) : 4308;

        const positions = await Promise.all(
          ids.map(async (id) => {
            const meta = await fetchPositionMeta(id);
            if (!meta) return null;

            const [poolInfo, lowerTick, upperTick] = await Promise.all([
              fetchPoolPositionInfo(owner!, meta.tick_lower, meta.tick_upper),
              fetchTickInfo(meta.tick_lower),
              fetchTickInfo(meta.tick_upper),
            ]);

            const sqrtLower = priceToSqrtPriceX64(tickToPrice(meta.tick_lower));
            const sqrtUpper = priceToSqrtPriceX64(tickToPrice(meta.tick_upper));
            const liquidity = BigInt(meta.liquidity);

            const { amount0, amount1 } = getAmountsForLiquidity(
              sqrtCurrent,
              sqrtLower,
              sqrtUpper,
              liquidity
            );

            const storedOwed0 = BigInt(poolInfo?.tokens_owed_0 ?? "0");
            const storedOwed1 = BigInt(poolInfo?.tokens_owed_1 ?? "0");
            const fgInsideLast0 = BigInt(poolInfo?.fee_growth_inside_0_last ?? "0");
            const fgInsideLast1 = BigInt(poolInfo?.fee_growth_inside_1_last ?? "0");

            // Compute fees earned since the last position checkpoint
            let pendingOwed0 = 0n;
            let pendingOwed1 = 0n;
            if (liquidity > 0n && lowerTick && upperTick) {
              const [fgInside0, fgInside1] = computeFeeGrowthInside(
                meta.tick_lower, meta.tick_upper, currentTick,
                feeGlobals.fg0, feeGlobals.fg1,
                lowerTick, upperTick,
              );
              pendingOwed0 = (liquidity * wrappingSub128(fgInside0, fgInsideLast0)) / Q64;
              pendingOwed1 = (liquidity * wrappingSub128(fgInside1, fgInsideLast1)) / Q64;
            }

            return {
              id,
              pool: meta.pool,
              tickLower: meta.tick_lower,
              tickUpper: meta.tick_upper,
              liquidity,
              owner: owner!,
              inRange:
                currentTick >= meta.tick_lower &&
                currentTick < meta.tick_upper,
              priceLower: tickToPrice(meta.tick_lower),
              priceUpper: tickToPrice(meta.tick_upper),
              amount0,
              amount1,
              tokensOwed0: storedOwed0 + pendingOwed0,
              tokensOwed1: storedOwed1 + pendingOwed1,
              feeGrowthInside0Last: fgInsideLast0,
              feeGrowthInside1Last: fgInsideLast1,
            } satisfies Position;
          })
        );

        if (active) {
          setData(positions.filter(Boolean) as Position[]);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(err as Error);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    fetchAll();
    const interval = setInterval(fetchAll, 12000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [owner, trigger]);

  return { data, isLoading, error, refetch };
}

