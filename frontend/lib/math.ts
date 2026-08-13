export const Q64 = 2n ** 64n;
export const Q128 = 2n ** 128n;
export const MIN_TICK = -443636;
export const MAX_TICK = 443636;
export const MIN_TICK_USABLE = -443630;
export const MAX_TICK_USABLE = 443630;
export const MIN_SQRT_RATIO = 72057594037927936n;
export const MAX_SQRT_RATIO = 4722366482869645213696n;
export const TICK_SPACING = 10;

// ── Float helpers (display-only, mirrors contract math) ──────────────────────

export function tickToSqrtPrice(tick: number): number {
  return Math.sqrt(Math.pow(1.0001, tick));
}

export function sqrtPriceX64ToSqrtPrice(sqrtPriceX64: bigint): number {
  if (sqrtPriceX64 === 0n) return 0;
  return Number(sqrtPriceX64) / Number(Q64);
}

// ── Price impact ─────────────────────────────────────────────────────────────

export interface PriceImpactResult {
  impact: number;
  impactPercent: string;
  severity: "low" | "medium" | "high" | "very_high";
  label: string;
  isThinPool: boolean;
}

/**
 * Compute price impact from trade amounts.
 * effectivePrice = amountOut / amountIn  (token-out per token-in)
 * spotPrice      = expected rate at current pool price (same units)
 */
export function computePriceImpact(
  amountIn: number,
  amountOut: number,
  spotPriceOutPerIn: number,
  poolTvlUsd: number | null,
  amountInUsd: number
): PriceImpactResult {
  const zero: PriceImpactResult = {
    impact: 0,
    impactPercent: "0.00%",
    severity: "low",
    label: "Low impact",
    isThinPool: false,
  };
  if (amountIn <= 0 || spotPriceOutPerIn <= 0) return zero;

  const effectivePrice = amountOut / amountIn;
  const impact = Math.max(0, (spotPriceOutPerIn - effectivePrice) / spotPriceOutPerIn);
  const impactPercent = (impact * 100).toFixed(2) + "%";

  let severity: PriceImpactResult["severity"];
  if (impact < 0.001) severity = "low";
  else if (impact < 0.01) severity = "medium";
  else if (impact < 0.05) severity = "high";
  else severity = "very_high";

  const isThinPool = poolTvlUsd !== null && poolTvlUsd > 0 && amountInUsd > poolTvlUsd * 0.10;

  const label =
    severity === "low" ? "Low impact" :
    severity === "medium" ? "Medium impact" :
    severity === "high" ? "High impact" :
    "Very high impact — swap may lose significant value";

  return { impact, impactPercent, severity, label, isThinPool };
}

// ── USD helpers (display-only, never passed to contract) ────────────────────

export function toUsd(
  amount: number,
  tokenSymbol: "xlm" | "usdc",
  prices: { xlmUsd: number; usdcUsd: number }
): number {
  if (amount <= 0) return 0;
  return tokenSymbol === "xlm" ? amount * prices.xlmUsd : amount * prices.usdcUsd;
}

export function formatUsd(usdAmount: number): string {
  if (usdAmount === 0) return "";
  if (usdAmount < 0.01) return "< $0.01";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(usdAmount);
}

export function formatTokenAmount(amount: number, decimals = 6): string {
  if (amount === 0) return "";
  if (amount < 0.000001) return "< 0.000001";
  return amount.toFixed(decimals).replace(/\.?0+$/, "");
}

export function tickToPrice(tick: number): number {
  return Math.pow(1.0001, tick);
}

export function priceToTick(price: number): number {
  if (price <= 0) return MIN_TICK;
  return Math.floor(Math.log(price) / Math.log(1.0001));
}

export function roundTick(tick: number, spacing: number = TICK_SPACING): number {
  return Math.round(tick / spacing) * spacing;
}

export function clampTick(tick: number): number {
  return Math.max(MIN_TICK_USABLE, Math.min(MAX_TICK_USABLE, tick));
}

export function priceToSqrtPriceX64(price: number): bigint {
  if (price <= 0) return 0n;
  const sqrtPrice = Math.sqrt(price);
  return BigInt(Math.floor(sqrtPrice * Number(Q64)));
}

export function sqrtPriceX64ToPrice(sqrtPriceX64: bigint): number {
  const sqrtPrice = Number(sqrtPriceX64) / Number(Q64);
  return sqrtPrice * sqrtPrice;
}

export function mulDiv(a: bigint, b: bigint, c: bigint): bigint {
  if (c === 0n) throw new Error("division by zero");
  return (a * b) / c;
}

export function getAmountsForLiquidity(
  sqrtPriceX64: bigint,
  sqrtLowerX64: bigint,
  sqrtUpperX64: bigint,
  liquidity: bigint
): { amount0: bigint; amount1: bigint } {
  if (sqrtPriceX64 <= sqrtLowerX64) {
    return {
      amount0:
        mulDiv(
          liquidity << 64n,
          sqrtUpperX64 - sqrtLowerX64,
          sqrtUpperX64
        ) / sqrtLowerX64,
      amount1: 0n,
    };
  } else if (sqrtPriceX64 < sqrtUpperX64) {
    return {
      amount0:
        mulDiv(
          liquidity << 64n,
          sqrtUpperX64 - sqrtPriceX64,
          sqrtUpperX64
        ) / sqrtPriceX64,
      amount1: mulDiv(liquidity, sqrtPriceX64 - sqrtLowerX64, Q64),
    };
  } else {
    return {
      amount0: 0n,
      amount1: mulDiv(liquidity, sqrtUpperX64 - sqrtLowerX64, Q64),
    };
  }
}

function getLiquidityForAmount0(
  sqrtLo: bigint,
  sqrtHi: bigint,
  amount0: bigint
): bigint {
  // L = amount0 * sqrtLo * sqrtHi / (Q64 * (sqrtHi - sqrtLo))
  // Use mulDiv(amount0, intermediate, denominator) — one division by Q64, not two.
  const intermediate = mulDiv(sqrtLo, sqrtHi, Q64);
  return mulDiv(amount0, intermediate, sqrtHi - sqrtLo);
}

function getLiquidityForAmount1(
  sqrtLo: bigint,
  sqrtHi: bigint,
  amount1: bigint
): bigint {
  return mulDiv(amount1, Q64, sqrtHi - sqrtLo);
}

export function getLiquidityForAmounts(
  sqrtPriceX64: bigint,
  sqrtLowerX64: bigint,
  sqrtUpperX64: bigint,
  amount0: bigint,
  amount1: bigint
): bigint {
  if (sqrtPriceX64 <= sqrtLowerX64) {
    return getLiquidityForAmount0(sqrtLowerX64, sqrtUpperX64, amount0);
  } else if (sqrtPriceX64 < sqrtUpperX64) {
    const l0 = getLiquidityForAmount0(sqrtPriceX64, sqrtUpperX64, amount0);
    const l1 = getLiquidityForAmount1(sqrtLowerX64, sqrtPriceX64, amount1);
    return l0 < l1 ? l0 : l1;
  } else {
    return getLiquidityForAmount1(sqrtLowerX64, sqrtUpperX64, amount1);
  }
}

export function computeUnclaimedFees(
  liquidity: bigint,
  feeGrowthInside0Now: bigint,
  feeGrowthInside1Now: bigint,
  feeGrowthInside0Last: bigint,
  feeGrowthInside1Last: bigint
): { fees0: bigint; fees1: bigint } {
  const fees0 = mulDiv(
    liquidity,
    (feeGrowthInside0Now - feeGrowthInside0Last + Q128) % Q128,
    Q128
  );
  const fees1 = mulDiv(
    liquidity,
    (feeGrowthInside1Now - feeGrowthInside1Last + Q128) % Q128,
    Q128
  );
  return { fees0, fees1 };
}

export function toStroops(amount: string, decimals = 7): bigint {
  if (!amount || amount === ".") return 0n;
  const parts = amount.split(".");
  const whole = BigInt(parts[0] || "0");
  const frac = (parts[1] || "").padEnd(decimals, "0").slice(0, decimals);
  return whole * 10n ** BigInt(decimals) + BigInt(frac);
}

export function fromStroops(amount: bigint, decimals = 7): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = amount / divisor;
  const frac = (amount % divisor).toString().padStart(decimals, "0");
  const trimmed = frac.replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole.toString();
}

export function formatAmount(amount: bigint, decimals = 7, maxFrac = 4): string {
  const str = fromStroops(amount, decimals);
  const parts = str.split(".");
  if (parts[1]) {
    parts[1] = parts[1].slice(0, maxFrac);
  }
  return parts.filter(Boolean).join(".");
}

/**
 * Off-chain single-step CLMM swap quote. Mirrors compute_swap_step() in swap.rs exactly.
 * poolZeroForOne = true  → selling token_0 (USDC), buying token_1 (XLM)  [price moves down]
 * poolZeroForOne = false → selling token_1 (XLM),  buying token_0 (USDC) [price moves up]
 * fee: millionths, e.g. 3000 = 0.3%
 */
export function computeSwapQuote(
  sqrtPriceX64: bigint,
  liquidity: bigint,
  amountIn: bigint,
  poolZeroForOne: boolean,
  fee: number,
): bigint {
  if (liquidity === 0n || amountIn === 0n) return 0n;

  const amountAfterFee = mulDiv(amountIn, BigInt(1_000_000 - fee), 1_000_000n);
  if (amountAfterFee === 0n) return 0n;

  if (poolZeroForOne) {
    // Selling token_0 (USDC). Price moves down.
    // next_sqrt_from_input(sqrtP, L, amount, zero_for_one=true):
    //   lq = L * sqrtP / Q64
    //   amt_scaled = amount * sqrtP / Q64
    //   sqrtNext = lq * Q64 / (L + amt_scaled)
    const lq = mulDiv(liquidity, sqrtPriceX64, Q64);
    const amtScaled = mulDiv(amountAfterFee, sqrtPriceX64, Q64);
    const denom = liquidity + amtScaled;
    if (denom === 0n) return 0n;
    const sqrtNext = mulDiv(lq, Q64, denom);
    if (sqrtNext >= sqrtPriceX64) return 0n;
    // amount_1_delta(sqrtNext, sqrtCurrent, L, round_down) = L * (sqrtHi - sqrtLo) / Q64
    return mulDiv(liquidity, sqrtPriceX64 - sqrtNext, Q64);
  } else {
    // Selling token_1 (XLM). Price moves up.
    // next_sqrt_from_input(sqrtP, L, amount, zero_for_one=false):
    //   sqrtNext = sqrtP + amount * Q64 / L
    const sqrtNext = sqrtPriceX64 + mulDiv(amountAfterFee, Q64, liquidity);
    if (sqrtNext <= sqrtPriceX64) return 0n;
    // amount_0_delta(sqrtCurrent, sqrtNext, L, round_down):
    //   = mul_div(mul_div(L << 64, sqrtNext - sqrtCurrent, sqrtNext), 1, sqrtCurrent)
    const num1 = liquidity << 64n;
    const num2 = sqrtNext - sqrtPriceX64;
    const intermediate = mulDiv(num1, num2, sqrtNext);
    if (sqrtPriceX64 === 0n) return 0n;
    return mulDiv(intermediate, 1n, sqrtPriceX64);
  }
}

export function priceImpactColor(impact: number): string {
  if (impact < 0.001) return "text-green-400";
  if (impact < 0.01) return "text-yellow-400";
  return "text-red-400";
}

export function applyPreset(
  currentPrice: number,
  pct: number | null,
  spacing: number = TICK_SPACING
): { tickLower: number; tickUpper: number } {
  if (pct === null) {
    return { tickLower: MIN_TICK_USABLE, tickUpper: MAX_TICK_USABLE };
  }
  const lower = clampTick(
    roundTick(priceToTick(currentPrice * (1 - pct)), spacing)
  );
  const upper = clampTick(
    roundTick(priceToTick(currentPrice * (1 + pct)), spacing)
  );
  return { tickLower: lower, tickUpper: upper };
}
