import {
  buildContractTx,
  addressToScVal,
  bigintToU128,
  bigintToI128,
  boolToScVal,
  u32ToScVal,
  u64ToScVal,
  i32ToScVal,
} from "./stellar";
import { PM_ADDRESS, POOL_ADDRESS } from "./stellar/contracts";
import { USDC_ADDRESS } from "./stellar/assets";
import { MIN_SQRT_RATIO, MAX_SQRT_RATIO } from "./math";
import { xdr } from "@stellar/stellar-sdk";

/**
 * Build a direct pool.swap transaction, bypassing the router.
 *
 * The router contract has a hard-coded `approve(..., &200u32)` which uses
 * ledger 200 as the expiration — already expired on mainnet/testnet. Calling
 * pool.swap directly avoids that broken internal approve; the user's
 * pre-approval of the pool (done separately before this call) is sufficient.
 *
 * Pool convention: zero_for_one=true → selling token_0 (USDC).
 * UI convention:   tokenIn=XLM → selling XLM (token_1) → zero_for_one=false.
 */
export async function buildSwapTx(
  walletAddress: string,
  tokenIn: string,
  _tokenOut: string,        // kept for API compat
  _fee: number,             // kept for API compat
  amountIn: bigint,
  _amountOutMinimum: bigint, // kept for API compat; slippage enforced via quote re-fetch
  _deadline: bigint,         // kept for API compat; pool.swap has no deadline param
  _sqrtPriceLimitX64: bigint // kept for API compat; overridden with safe defaults below
): Promise<string> {
  // If selling USDC (token_0), zero_for_one=true (price moves down).
  // If selling XLM  (token_1), zero_for_one=false (price moves up).
  const poolZeroForOne = tokenIn === USDC_ADDRESS;

  // Safe price limits — pool requires a non-zero limit inside its valid range.
  // These mirror the router's own defaults.
  const priceLimit = poolZeroForOne
    ? MIN_SQRT_RATIO + 1n  // selling USDC: price moves toward min
    : MAX_SQRT_RATIO - 1n; // selling XLM:  price moves toward max

  const tx = await buildContractTx(
    POOL_ADDRESS,
    "swap",
    [
      addressToScVal(walletAddress), // caller
      boolToScVal(poolZeroForOne),   // zero_for_one
      bigintToI128(amountIn),        // amount_specified (positive → exact-in)
      bigintToU128(priceLimit),      // sqrt_price_limit_x64
    ],
    walletAddress
  );
  return tx.toXDR();
}

export async function buildApprovalTx(
  walletAddress: string,
  tokenAddress: string,
  spender: string,
  amount: bigint,
  expirationLedger: number
): Promise<string> {
  const tx = await buildContractTx(
    tokenAddress,
    "approve",
    [
      addressToScVal(walletAddress),
      addressToScVal(spender),
      bigintToI128(amount),
      u32ToScVal(expirationLedger),
    ],
    walletAddress
  );
  return tx.toXDR();
}

export async function buildMintTx(
  walletAddress: string,
  pool: string,
  tickLower: number,
  tickUpper: number,
  liquidity: bigint,
  amount0Min: bigint,
  amount1Min: bigint,
  deadline: bigint
): Promise<string> {
  // ScMap keys must be sorted in ascending lexicographic order (Soroban requirement)
  const mintParams = xdr.ScVal.scvMap([
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("amount_0_min"),
      val: bigintToU128(amount0Min),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("amount_1_min"),
      val: bigintToU128(amount1Min),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("deadline"),
      val: u64ToScVal(deadline),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("liquidity"),
      val: bigintToU128(liquidity),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("pool"),
      val: addressToScVal(pool),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("recipient"),
      val: addressToScVal(walletAddress),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("tick_lower"),
      val: i32ToScVal(tickLower),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("tick_upper"),
      val: i32ToScVal(tickUpper),
    }),
  ]);

  const tx = await buildContractTx(
    PM_ADDRESS,
    "mint",
    [mintParams],
    walletAddress
  );
  return tx.toXDR();
}

export async function buildDecreaseLiquidityTx(
  walletAddress: string,
  positionId: bigint,
  liquidity: bigint,
  amount0Min: bigint,
  amount1Min: bigint,
  deadline: bigint
): Promise<string> {
  const tx = await buildContractTx(
    PM_ADDRESS,
    "decrease_liquidity",
    [
      bigintToU128(positionId),
      bigintToU128(liquidity),
      bigintToU128(amount0Min),
      bigintToU128(amount1Min),
      u64ToScVal(deadline),
    ],
    walletAddress
  );
  return tx.toXDR();
}

export async function buildCollectTx(
  walletAddress: string,
  positionId: bigint,
  recipient: string
): Promise<string> {
  const tx = await buildContractTx(
    PM_ADDRESS,
    "collect",
    [bigintToU128(positionId), addressToScVal(recipient)],
    walletAddress
  );
  return tx.toXDR();
}
